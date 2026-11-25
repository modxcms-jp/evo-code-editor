// どの textarea を替えるか。画面の番号（a=）ではなく、DOM だけで見分ける
// （シェルは URL を変えずに画面を差し替えることがある）

function titleOf(ta) {
    const box = ta.closest('.code-editor');
    const title = box && box.querySelector('.code-editor-title');
    return title ? title.textContent.trim() : '';
}

function hasRichEditor(ta) {
    const mce = window.tinymce;
    if (mce && ta.id && typeof mce.get === 'function' && mce.get(ta.id)) return true;
    const ck = window.CKEDITOR;
    return !!(ck && ck.instances && ta.id && ck.instances[ta.id]);
}

// リッチテキストの選択（投稿・下書き・チャンク）。無い・「なし」のときだけ対象にする。
// use_editor がオフなら、選択があってもリッチテキストは付かない
function richTextOff(ta, config) {
    const select = ta.form && ta.form.querySelector('#which_editor, select[name="which_editor"]');
    if (select && config.useEditor && select.value !== 'none') return false;
    return !hasRichEditor(ta);
}

function elementKind(ta) {
    const a = ta.form && ta.form.elements.namedItem('a');
    // 保存の処理の番号: 20 テンプレート / 79 チャンク / 24 スニペット / 103 プラグイン / 109 モジュール
    const action = a && 'value' in a ? String(a.value) : '';
    return action === '20' || action === '79' ? 'html' : 'php';
}

/** @returns {object|null} Bridge に渡す設定。対象でなければ null */
export function describe(ta, config) {
    if (!(ta instanceof HTMLTextAreaElement)) return null;

    // ファイルのテキスト編集（エレメントと同じ形なので、先に見る）
    if (ta.matches('[data-role="text-area"]')) {
        const overlay = ta.closest('[data-role="text-overlay"]');
        const name = overlay && overlay.querySelector('[data-role="text-name"]');
        if (!name) return null;
        return { kind: 'file', fileName: () => name.textContent.trim(), label: () => name.textContent.trim() || 'file', wrapperClass: 'evo-ce-file evo-fb-text-area' };
    }
    // form.id は、フォームの中の name="id" の欄を指すので、属性で見る
    if (!ta.form || (ta.form.getAttribute('id') !== 'mutate' && ta.form.getAttribute('name') !== 'mutate')) return null;

    // エレメントのコード
    if (ta.matches('.code-editor textarea.phptextarea')) {
        if (!richTextOff(ta, config)) return null;
        return { kind: elementKind(ta), label: titleOf(ta) };
    }
    // 投稿・下書きの本文
    if (ta.id === 'ta' && ta.name === 'ta') {
        if (!richTextOff(ta, config)) return null;
        return { kind: 'html', label: 'content' };
    }
    return null;
}

export const SELECTOR = '[data-role="text-area"], .code-editor textarea.phptextarea, textarea#ta';
