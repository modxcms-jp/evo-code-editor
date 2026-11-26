import { linter } from '@codemirror/lint';
import { syntaxTree } from '@codemirror/language';

// 無いチャンク・スニペットの名前に波線を引く。名前の一覧は plugin.php から受け取る
// 設定のキーは、プラグインが読み込みのときに足すことがあるので見ない

// plugin.php が渡す上限。これに達した一覧は欠けているかもしれないので、判定に使わない
const LIMIT = 2000;
// 名前のすぐ後ろが閉じの記号・引数・モディファイアのものだけを見る（{{[+tpl+]}} のように組み立てた名前は見ない）
const TAG = /(\{\{|\[\[|\[!)([^\s{}[\]()*!?&:=`"'<>,;|/\\]+)(?=\s*(?:\}\}|\]\]|!\]|\?|:|&))/g;
// タグを見るのは HTML の中（根が Document）だけ。PHP のコードには Document が無い。
// script・style の中の [[ は JS の配列などで、タグではない
const CODE = new Set(['Script', 'ScriptText', 'StyleSheet', 'StyleText']);

const TEXT = {
    ja: { chunk: (n) => `チャンク「${n}」はありません`, snippet: (n) => `スニペット「${n}」はありません` },
    en: { chunk: (n) => `No chunk named "${n}"`, snippet: (n) => `No snippet named "${n}"` }
};

function inHtml(state, pos) {
    for (let node = syntaxTree(state).resolveInner(pos, 1); node; node = node.parent) {
        if (CODE.has(node.name)) return false;
        if (node.name === 'Document') return true;
    }
    return false;
}

function known(list) {
    return list && list.length && list.length < LIMIT ? new Set(list.map(([name]) => name)) : null;
}

function prepare(o) {
    const names = o.names || {};
    const sets = { chunk: known(names.chunks), snippet: known(names.snippets) };
    return sets.chunk || sets.snippet ? { sets, text: TEXT[o.lang] || TEXT.en } : null;
}

function scan(state, { sets, text }) {
    const found = [];
    for (const m of state.doc.toString().matchAll(TAG)) {
        const kind = m[1] === '{{' ? 'chunk' : 'snippet';
        const set = sets[kind];
        const name = m[2];
        if (!set || set.has(name)) continue;
        const from = m.index + m[1].length;
        if (!inHtml(state, from)) continue;
        found.push({ from, to: from + name.length, severity: 'warning', message: text[kind](name) });
    }
    return found;
}

/** 無い名前の一覧 */
export function unknownTags(state, o) {
    const p = prepare(o);
    return p ? scan(state, p) : [];
}

/**
 * @param {object} o { names: サーバーから受け取った名前, lang }
 */
export function tagLint(o) {
    const p = prepare(o);
    return p ? linter((view) => scan(view.state, p)) : [];
}
