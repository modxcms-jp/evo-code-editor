import { EditorState, Prec } from '@codemirror/state';
import {
    EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, highlightSpecialChars,
    drawSelection, dropCursor, rectangularSelection, crosshairCursor
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab, simplifySelection } from '@codemirror/commands';
import { search, searchKeymap, highlightSelectionMatches, closeSearchPanel, searchPanelOpen } from '@codemirror/search';
import {
    bracketMatching, foldGutter, foldKeymap, indentOnInput, indentUnit, syntaxHighlighting, HighlightStyle
} from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

const PHRASES_JA = {
    'Find': '検索', 'Replace': '置換', 'next': '次へ', 'previous': '前へ', 'all': 'すべて選択',
    'match case': '大文字と小文字を区別', 'by word': '単語で', 'regexp': '正規表現',
    'replace': '置換', 'replace all': 'すべて置換', 'close': '閉じる',
    'current match': '今の一致', 'replaced $ matches': '$ 件を置換しました',
    'replaced match on line $': '$ 行目を置換しました', 'on line': '行',
    'Go to line': '行へ移動', 'go': '移動',
    'Fold line': '折りたたむ', 'Unfold line': '開く', 'Fold': '折りたたむ', 'Unfold': '開く',
    'folded code': '折りたたんだコード', 'unfold': '開く', 'to': 'から',
    'Control character': '制御文字', 'Selection deleted': '選択を削除しました'
};

// 色は style.css で付ける。TinyMCE のダイアログの中では、詳細度の低い指定が打ち消されるため
const highlight = HighlightStyle.define([
    { tag: [t.keyword, t.modifier, t.operatorKeyword, t.controlKeyword], class: 'evo-hl-keyword' },
    { tag: [t.tagName, t.angleBracket], class: 'evo-hl-tag' },
    { tag: [t.attributeName], class: 'evo-hl-attr' },
    { tag: [t.string, t.attributeValue, t.special(t.string)], class: 'evo-hl-string' },
    { tag: [t.number, t.bool, t.null, t.atom], class: 'evo-hl-number' },
    { tag: [t.comment, t.docComment], class: 'evo-hl-comment' },
    { tag: [t.function(t.variableName), t.function(t.propertyName)], class: 'evo-hl-function' },
    { tag: [t.definition(t.variableName), t.variableName], class: 'evo-hl-variable' },
    { tag: [t.className, t.typeName, t.namespace], class: 'evo-hl-type' },
    { tag: [t.propertyName], class: 'evo-hl-property' },
    { tag: [t.meta, t.processingInstruction], class: 'evo-hl-meta' },
    { tag: [t.heading], class: 'evo-hl-heading' },
    { tag: [t.link, t.url], class: 'evo-hl-link' },
    { tag: t.invalid, class: 'evo-hl-invalid' }
]);

// 検索の欄は編集のフォーム（#mutate）の中に出る。保存の値やプレビューの比べに混ざらないよう名前を外し、
// フォームが受ける input・change を外へ出さない
function isolatePanel(view) {
    view.dom.querySelectorAll('.cm-panel input, .cm-panel button').forEach((el) => {
        if (el.name === 'close') el.classList.add('evo-ce-close');
        el.removeAttribute('name');
        el.setAttribute('form', '');
    });
    view.dom.querySelectorAll('.cm-panels').forEach((el) => {
        if (el.dataset.isolated) return;
        el.dataset.isolated = '1';
        ['input', 'change', 'keyup', 'submit'].forEach((type) => el.addEventListener(type, (e) => e.stopPropagation()));
    });
}

// 中身に合わせて、字下げをタブか空白かにする（分からなければ空白 4 つ）
function detectIndent(text) {
    const sample = text.slice(0, 20000);
    if (/^\t/m.test(sample)) return '\t';
    const m = /^( {2,8})\S/m.exec(sample);
    return m && m[1].length % 4 !== 0 && m[1].length === 2 ? '  ' : '    ';
}

/**
 * @param {string} text
 * @param {object} o { onSave, label, lang }
 */
export function baseExtensions(text, o) {
    return [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        EditorState.tabSize.of(4),
        indentUnit.of(detectIndent(text)),
        indentOnInput(),
        bracketMatching(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        syntaxHighlighting(highlight),
        search({ top: true }),
        o.lang === 'ja' ? EditorState.phrases.of(PHRASES_JA) : [],
        EditorView.contentAttributes.of({
            'aria-label': o.label || 'code', spellcheck: 'false', autocorrect: 'off', autocapitalize: 'off', translate: 'no'
        }),
        EditorView.updateListener.of((u) => {
            if (searchPanelOpen(u.state)) isolatePanel(u.view);
        }),
        Prec.highest(keymap.of([
            // ファイルのダイアログやモーダルは Escape で閉じる。検索を閉じる・選択を 1 つに戻すだけのときは、外へ伝えない
            { key: 'Escape', run: (v) => searchPanelOpen(v.state) && closeSearchPanel(v), scope: 'editor search-panel', stopPropagation: true },
            { key: 'Escape', run: simplifySelection, stopPropagation: true },
            { key: 'Mod-s', run: o.onSave }
        ])),
        keymap.of([indentWithTab, ...searchKeymap, ...historyKeymap, ...foldKeymap, ...defaultKeymap])
    ];
}
