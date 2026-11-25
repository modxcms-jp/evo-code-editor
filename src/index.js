import { Bridge } from './bridge.js';
import { describe, SELECTOR } from './targets.js';

const config = Object.assign({ useEditor: true, lang: 'ja' }, window.evoCodeEditorConfig);
const KEY = 'evoCodeEditor';
const TEXT = config.lang === 'ja'
    ? { on: '色分けを使う', off: '素の欄に戻す' }
    : { on: 'Use code editor', off: 'Use plain text' };

const bridges = new Set();
const byArea = new WeakMap();
// 1 つの欄について、替えるかどうかを決めるのは 1 回だけ（送信の前に選択が変わることがあるため）
const skipped = new WeakSet();

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

function addToggle(ta) {
    if (ta.dataset.ceToggle) return;
    ta.dataset.ceToggle = '1';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'evo-ce-toggle';
    button.addEventListener('click', () => {
        setEnabled(!enabled());
        enabled() ? scan() : bridges.forEach(detach);
        document.querySelectorAll('.evo-ce-toggle').forEach(label);
    });
    label(button);
    const box = ta.closest('.code-editor');
    const header = box && box.querySelector('.code-editor-header');
    if (header) {
        header.appendChild(button);
    } else {
        const row = document.createElement('div');
        row.className = 'evo-ce-toggle-row';
        row.appendChild(button);
        ta.before(row);
    }
}

function label(button) {
    button.textContent = enabled() ? TEXT.off : TEXT.on;
}

function attach(ta) {
    if (byArea.has(ta) || skipped.has(ta)) return;
    const target = describe(ta, config);
    if (!target) {
        skipped.add(ta);
        return;
    }
    addToggle(ta);
    if (!enabled()) return;
    let bridge = null;
    try {
        bridge = new Bridge(ta, Object.assign({ lang: config.lang }, target));
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
    document.querySelectorAll(SELECTOR).forEach(attach);
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

// あとからリッチテキストが付いたら、素の欄に戻して渡す
function watchRichEditor() {
    const mce = window.tinymce;
    if (!mce || mce.__evoCodeEditor || typeof mce.on !== 'function') return;
    mce.__evoCodeEditor = true;
    mce.on('AddEditor', (e) => {
        bridges.forEach((b) => {
            if (e.editor && b.ta.id && b.ta.id === e.editor.id) {
                skipped.add(b.ta);
                detach(b);
            }
        });
    });
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
window.evoCodeEditor = { scan, bridges, of: (ta) => byArea.get(ta) || null };
