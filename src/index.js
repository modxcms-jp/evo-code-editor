import { Bridge } from './bridge.js';
import { describe, SELECTOR } from './targets.js';

const config = Object.assign({ useEditor: true, lang: 'ja' }, window.evoCodeEditorConfig);
const KEY = 'evoCodeEditor';
// チャンクで Emmet を使うか（既定は使わない。チャンクは HTML とは限らないため）
const EMMET_KEY = 'evoCodeEditorEmmetChunk';
const TEXT = config.lang === 'ja'
    ? { on: '色分けを使う', off: '素の欄に戻す', emmetOn: 'Emmet を使う', emmetOff: 'Emmet を使わない' }
    : { on: 'Use code editor', off: 'Use plain text', emmetOn: 'Use Emmet', emmetOff: 'Disable Emmet' };

const bridges = new Set();
const byArea = new WeakMap();
// 1 つの欄について、替えるかどうかを決めるのは 1 回だけ（送信の前に選択が変わることがあるため）
const skipped = new WeakSet();
const api = {};
// TinyMCE のソースのダイアログの欄（切り替えで付け直すため、設定を覚える）
const sourceAreas = new WeakMap();

function enabled() {
    try {
        return localStorage.getItem(KEY) !== 'off';
    } catch (e) {
        return window.__evoCodeEditorOff !== true;
    }
}

function setEnabled(on) {
    window.__evoCodeEditorOff = !on;
    try {
        localStorage.setItem(KEY, on ? 'on' : 'off');
    } catch (e) { /* 覚えられないときは、この画面の間だけ */ }
}

function emmetOn() {
    try {
        return localStorage.getItem(EMMET_KEY) === 'on';
    } catch (e) {
        return window.__evoCodeEditorEmmet === true;
    }
}

function setEmmetOn(on) {
    window.__evoCodeEditorEmmet = on;
    try {
        localStorage.setItem(EMMET_KEY, on ? 'on' : 'off');
    } catch (e) { /* 覚えられないときは、この画面の間だけ */ }
}

// Emmet を選べる欄（チャンク）のボタン。素の欄のときは隠す
function addEmmetToggle(ta, toggle) {
    if (ta.dataset.ceEmmetToggle) return;
    ta.dataset.ceEmmetToggle = '1';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'evo-ce-toggle evo-ce-emmet-toggle';
    button.addEventListener('click', () => {
        setEmmetOn(!emmetOn());
        bridges.forEach((b) => b.o.emmetOptional && b.refreshEmmet());
        document.querySelectorAll('.evo-ce-emmet-toggle').forEach(labelEmmet);
    });
    labelEmmet(button);
    toggle.before(button);
}

function labelEmmet(button) {
    button.textContent = emmetOn() ? TEXT.emmetOff : TEXT.emmetOn;
    button.hidden = !enabled();
}

function addToggle(ta) {
    if (ta.dataset.ceToggle) return ta.__evoCeToggle;
    ta.dataset.ceToggle = '1';
    const button = document.createElement('button');
    ta.__evoCeToggle = button;
    button.type = 'button';
    button.className = 'evo-ce-toggle';
    button.addEventListener('click', () => {
        setEnabled(!enabled());
        enabled() ? scan() : bridges.forEach(detach);
        document.querySelectorAll('.evo-ce-toggle:not(.evo-ce-emmet-toggle)').forEach(label);
        document.querySelectorAll('.evo-ce-emmet-toggle').forEach(labelEmmet);
    });
    label(button);
    const box = ta.closest('.code-editor');
    const dialog = ta.closest('.tox-dialog');
    const header = (box && box.querySelector('.code-editor-header')) || (dialog && dialog.querySelector('.tox-dialog__footer-start'));
    if (header) {
        header.appendChild(button);
    } else {
        const row = document.createElement('div');
        row.className = 'evo-ce-toggle-row';
        row.appendChild(button);
        ta.before(row);
    }
    return button;
}

function label(button) {
    button.textContent = enabled() ? TEXT.off : TEXT.on;
}

function attach(ta, given) {
    if (byArea.has(ta) || skipped.has(ta)) return;
    const target = given || describe(ta, config);
    if (!target) {
        skipped.add(ta);
        return;
    }
    if (given) sourceAreas.set(ta, given);
    const toggle = addToggle(ta);
    if (target.emmetOptional && toggle) addEmmetToggle(ta, toggle);
    if (!enabled()) return;
    let bridge = null;
    try {
        bridge = new Bridge(ta, Object.assign({ lang: config.lang, names: config.names, emmetOn }, target));
    } catch (e) {
        // 替えられなければ、元の textarea のまま使えるようにする
        console.error('[evo-code-editor]', e);
        ta.classList.remove('evo-ce-source');
        delete ta.value;
        delete ta.focus;
        ta.parentNode && ta.parentNode.querySelectorAll(':scope > .evo-ce').forEach((el) => el.remove());
        skipped.add(ta);
        return;
    }
    bridges.add(bridge);
    byArea.set(ta, bridge);
}

function detach(bridge) {
    bridges.delete(bridge);
    byArea.delete(bridge.ta);
    bridge.destroy();
}

function scan() {
    document.querySelectorAll(SELECTOR).forEach((ta) => attach(ta));
    document.querySelectorAll('.tox-dialog textarea').forEach((ta) => sourceAreas.has(ta) && attach(ta, sourceAreas.get(ta)));
}

// evoshell:unload は、モーダルの開閉でも出る。画面から外れた欄だけを片付ける
function sweep() {
    bridges.forEach((b) => {
        if (b.ta.isConnected) {
            b.suspend(false);
        } else {
            detach(b);
        }
    });
}

function onUnload() {
    bridges.forEach((b) => b.suspend(true));
    queueMicrotask(() => setTimeout(sweep, 0));
}

// TinyMCE: あとからリッチテキストが付いた欄は素に戻して渡す。ソースのダイアログの欄には、同じエディタを付ける
function watchRichEditor() {
    const mce = window.tinymce;
    if (!mce || mce.__evoCodeEditor === api || typeof mce.on !== 'function') return;
    // 文書の差し替えの前に登録したもの（古いスクリプトのもの）を外してから付ける
    if (typeof mce.__evoCodeEditorUnwatch === 'function') mce.__evoCodeEditorUnwatch();
    mce.__evoCodeEditor = api;
    const onOpen = (e) => current() && openSource(e.dialog);
    const onClose = () => current() && setTimeout(sweep, 0);
    const watch = (editor) => {
        editor.on('OpenWindow', onOpen);
        editor.on('CloseWindow', onClose);
    };
    const onAdd = (e) => {
        if (!current() || !e.editor) return;
        bridges.forEach((b) => {
            if (b.ta.id && b.ta.id === e.editor.id) {
                skipped.add(b.ta);
                detach(b);
            }
        });
        watch(e.editor);
    };
    mce.on('AddEditor', onAdd);
    (mce.get() || []).forEach(watch);
    mce.__evoCodeEditorUnwatch = () => {
        mce.off('AddEditor', onAdd);
        (mce.get() || []).forEach((editor) => {
            editor.off('OpenWindow', onOpen);
            editor.off('CloseWindow', onClose);
        });
    };
}

// シェルが文書ごと差し替えると、このスクリプトがもう一度動く。古いほうは何もしない
function current() {
    return window.evoCodeEditor === api;
}

function openSource(dialog) {
    let keys = [];
    try {
        keys = Object.keys(dialog.getData());
    } catch (e) {
        return;
    }
    // ソースのダイアログは「code」の欄だけを持つ
    if (keys.length !== 1 || keys[0] !== 'code') return;
    const find = (n) => {
        const ta = [...document.querySelectorAll('.tox-dialog textarea')].pop();
        if (!ta) {
            if (n > 0) setTimeout(() => find(n - 1), 30);
            return;
        }
        const focused = document.activeElement === ta;
        attach(ta, { kind: 'html', label: 'HTML', wrapperClass: 'evo-ce-tox', trapKeys: true });
        const bridge = byArea.get(ta);
        if (bridge && (focused || document.activeElement === document.body)) bridge.view.focus();
    };
    setTimeout(() => find(10), 0);
}

function start() {
    sweep();
    scan();
    watchRichEditor();
}

// 登録は文書ごとに 1 回（シェルが document.write で文書ごと差し替えると、登録は消える）
if (!document.documentElement.dataset.evoCodeEditor) {
    document.documentElement.dataset.evoCodeEditor = '1';
    document.addEventListener('evoshell:unload', onUnload);
    ['evoshell:load', 'evoshell:modalload', 'evoshell:modalclose'].forEach((type) => document.addEventListener(type, start));
    // TinyMCE はあとから読まれる。ソースのボタンを押すより前に、必ず気づく
    ['focusin', 'pointerdown'].forEach((type) => document.addEventListener(type, watchRichEditor, true));
    // タブを開いたときに、隠れている間に測れなかった大きさを測り直す
    document.addEventListener('click', (e) => {
        if (e.target.closest && e.target.closest('.tab-row, .tab')) {
            setTimeout(() => bridges.forEach((b) => b.measure()), 0);
        }
    });
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
}

// 試験・調査用
window.evoCodeEditor = Object.assign(api, { scan, bridges, of: (ta) => byArea.get(ta) || null });
