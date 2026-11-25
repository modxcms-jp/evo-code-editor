import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { baseExtensions } from './setup.js';
import { languageFor } from './languages.js';

// textarea を正とし、見た目だけを CodeMirror に替える。
// - 入力は textarea の値へ書き、input を出す。本体・ほかのプラグインは、これまでどおり textarea だけを見ればよい
// - textarea.value への代入（ファイルを開く・ManagerManager など）は、CodeMirror に映す。input は出さず、元に戻すの履歴も消す
// - 付けただけでは textarea の値に書かない（編集せず保存しても中身が変わらない）

const native = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
// これより長いものは、1 文字ごとに全文を写さず、値を読まれたとき・送られるときに写す
const LAZY_LENGTH = 300000;

export class Bridge {
    /**
     * @param {HTMLTextAreaElement} ta
     * @param {object} o { kind, fileName(), label, lang, wrapperClass }
     */
    constructor(ta, o) {
        this.ta = ta;
        this.o = o;
        this.stale = false; // CodeMirror の中身を、まだ textarea に写していない
        this.applying = false; // textarea への代入を映している間
        this.suspended = false; // 画面が差し替わる間。イベントを出さない
        this.pendingInput = false;
        this.focusValue = null;
        this.readOnly = new Compartment();
        this.wrap = new Compartment();
        this.cleanup = [];
        this.mount();
    }

    mount() {
        const ta = this.ta;
        const rect = ta.getBoundingClientRect();
        const height = rect.height > 40 ? rect.height : parseFloat(ta.style.height) || 370;

        this.wrapper = document.createElement('div');
        this.wrapper.className = ('evo-ce ' + (this.o.wrapperClass || '')).trim();
        if (!this.o.wrapperClass) {
            this.wrapper.style.height = Math.round(height) + 'px';
        }
        this.view = new EditorView({ state: this.createState(native.get.call(ta)), parent: this.wrapper });
        // ManagerManager などは textarea の親ごと動かすので、textarea のすぐ隣に置く
        ta.after(this.wrapper);
        ta.classList.add('evo-ce-source');
        this.intercept();
        this.listen();
        this.mirrorClass();
    }

    createState(text) {
        const fileName = this.o.fileName ? this.o.fileName() : '';
        let language = [];
        try {
            language = languageFor(this.o.kind, text, fileName);
        } catch (e) {
            console.warn('[evo-code-editor]', e);
        }
        return EditorState.create({
            doc: text,
            extensions: [
                baseExtensions(text, { label: typeof this.o.label === 'function' ? this.o.label() : this.o.label, lang: this.o.lang, onSave: () => this.forwardSave() }),
                language,
                this.readOnly.of(this.readOnlyExtension()),
                this.wrap.of(this.wrapExtension()),
                EditorView.updateListener.of((u) => {
                    if (u.docChanged && !this.applying) this.changed();
                })
            ]
        });
    }

    readOnlyExtension() {
        const locked = this.ta.readOnly || this.ta.disabled;
        return [EditorState.readOnly.of(locked), EditorView.editable.of(!this.ta.disabled)];
    }

    wrapExtension() {
        return this.ta.getAttribute('wrap') === 'off' ? [] : EditorView.lineWrapping;
    }

    text() {
        return this.view.state.doc.toString();
    }

    flush() {
        if (this.stale) {
            this.stale = false;
            native.set.call(this.ta, this.text());
        }
    }

    changed() {
        this.stale = true;
        if (this.view.state.doc.length <= LAZY_LENGTH) this.flush();
        // 日本語の変換中は出さない（ライブプレビューなどが、変換の途中の文字を拾わないように）
        if (this.view.composing || this.view.compositionStarted) {
            this.pendingInput = true;
            return;
        }
        // 受け手は input のたびに全文を読み比べることがある（ファイルの編集）。長いものは、打つ手が止まってから出す
        if (this.view.state.doc.length > LAZY_LENGTH) {
            this.pendingInput = true;
            clearTimeout(this.inputTimer);
            this.inputTimer = setTimeout(() => this.pendingInput && this.emitInput(), 250);
            return;
        }
        this.emitInput();
    }

    emitInput() {
        this.pendingInput = false;
        clearTimeout(this.inputTimer);
        if (!this.suspended) this.ta.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // textarea の value の読み書きと focus() を、CodeMirror に映す
    intercept() {
        const self = this;
        Object.defineProperty(this.ta, 'value', {
            configurable: true,
            enumerable: true,
            get() {
                self.flush();
                return native.get.call(self.ta);
            },
            set(v) {
                self.stale = false;
                self.pendingInput = false;
                clearTimeout(self.inputTimer);
                native.set.call(self.ta, v);
                const text = native.get.call(self.ta); // 改行は LF にそろう
                self.applying = true;
                try {
                    self.view.setState(self.createState(text));
                } finally {
                    self.applying = false;
                }
                // focus の間の代入は、利用者の変更ではない
                if (self.focusValue !== null) self.focusValue = text;
            }
        });
        this.ta.focus = (options) => {
            this.view.focus();
            if (!(options && options.preventScroll)) this.wrapper.scrollIntoView({ block: 'nearest' });
        };
    }

    listen() {
        const on = (target, type, fn, options) => {
            target.addEventListener(type, fn, options);
            this.cleanup.push(() => target.removeEventListener(type, fn, options));
        };
        on(this.wrapper, 'focusin', (e) => {
            if (this.focusValue !== null || !this.view.contentDOM.contains(e.target)) return;
            this.focusValue = this.text();
            this.ta.dispatchEvent(new FocusEvent('focus'));
        });
        // 欄の外へ出たときだけ（検索の欄との行き来では出さない）。ブラウザと同じく change、blur の順
        on(this.wrapper, 'focusout', (e) => {
            if (this.focusValue === null || (e.relatedTarget && this.wrapper.contains(e.relatedTarget))) return;
            // 別のウィンドウへ移っただけのときは、まだ欄の中にいる
            if (!e.relatedTarget && !document.hasFocus()) return;
            const before = this.focusValue;
            this.focusValue = null;
            if (this.suspended || !this.ta.isConnected) return;
            this.flush();
            if (this.pendingInput) this.emitInput();
            if (this.text() !== before) this.ta.dispatchEvent(new Event('change', { bubbles: true }));
            this.ta.dispatchEvent(new FocusEvent('blur'));
        });
        on(this.view.contentDOM, 'compositionend', () => {
            setTimeout(() => {
                if (this.pendingInput && this.view) this.emitInput();
            }, 0);
        });
        // ManagerManager の mm_synch_fields は textarea の keyup を聞く
        on(this.view.contentDOM, 'keyup', (e) => {
            if (!e.isComposing && !this.suspended) this.ta.dispatchEvent(new KeyboardEvent('keyup', { key: e.key }));
        });
        // 長いものを写さずに送られたときのため
        if (this.ta.form) {
            on(this.ta.form, 'formdata', (e) => {
                if (this.stale && this.ta.name) e.formData.set(this.ta.name, this.text());
            });
            on(this.ta.form, 'submit', () => this.flush(), true);
        }
        this.observer = new MutationObserver(() => this.syncAttributes());
        this.observer.observe(this.ta, { attributes: true, attributeFilter: ['readonly', 'disabled', 'wrap', 'class'] });
    }

    syncAttributes() {
        this.view.dispatch({
            effects: [
                this.readOnly.reconfigure(this.readOnlyExtension()),
                this.wrap.reconfigure(this.wrapExtension())
            ]
        });
        this.mirrorClass();
    }

    // 必須の欄の印など、textarea に付いたクラスを外側にも付ける
    mirrorClass() {
        this.wrapper.classList.toggle('mm_required', /\bmm_required\b/.test(this.ta.className));
        this.wrapper.classList.toggle('is-readonly', this.ta.readOnly || this.ta.disabled);
    }

    // 保存のキーは、本体（ファイルの編集など）が textarea の keydown で受ける
    forwardSave() {
        this.flush();
        if (this.pendingInput) this.emitInput();
        const e = new KeyboardEvent('keydown', {
            key: 's', code: 'KeyS', bubbles: true, cancelable: true,
            ctrlKey: !/Mac/.test(navigator.platform), metaKey: /Mac/.test(navigator.platform)
        });
        this.ta.dispatchEvent(e);
        return e.defaultPrevented;
    }

    suspend(on) {
        this.suspended = on;
    }

    measure() {
        this.view.requestMeasure();
    }

    // 元の textarea に戻す
    destroy() {
        this.suspended = true;
        clearTimeout(this.inputTimer);
        try {
            this.flush();
        } catch (e) { /* 外れた欄は写せなくてよい */ }
        this.observer && this.observer.disconnect();
        this.cleanup.forEach((fn) => fn());
        this.cleanup = [];
        delete this.ta.value;
        delete this.ta.focus;
        this.view && this.view.destroy();
        this.wrapper && this.wrapper.remove();
        this.ta.classList.remove('evo-ce-source');
    }
}
