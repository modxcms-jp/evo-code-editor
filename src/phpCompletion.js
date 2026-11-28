import { completeAnyWord, pickedCompletion } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import api from './evoApi.json';

// PHP の補完。Evolution の API（$modx・evo()・db() のメソッドと helpers.php の関数）と、文書の中の単語。
// 一覧は tools/evo-api.php で本体から作る（src/evoApi.json）

// -> のあと。$modx->db-> と db()-> は DBAPI、$modx-> と evo()-> は DocumentParser
const MEMBER = /(\$modx|\bevo\(\)|\bdb\(\))\s*->\s*(db\s*->\s*)?(\w*)$/;
// 関数の名前。前が $（変数）・->・::（メンバー）なら関数ではない
const FUNCTION_BEFORE = /(^|[^\w$>:])([A-Za-z_]\w*)$/;
const IDENT = /^\w*$/;

// PHP のコードの中か。文字列・コメントの中と、PHP のファイルの HTML の部分（祖先に HTML の Document がある）は外す
function inPhpCode(state, pos) {
    for (let node = syntaxTree(state).resolveInner(pos, -1); node; node = node.parent) {
        if (node.name === 'Document' || /String|Comment|Heredoc|Nowdoc/.test(node.name)) return false;
    }
    return true;
}

// 名前とカッコを入れる。引数が無ければ () まで、あれば ( まで（閉じは引数のあとに自分で打つ。
// () を入れてカーソルを中に置くと、閉じの記号を飛び越えないので、打った ) が二重になる）。すでにカッコが続くなら名前だけ
function applyCall(view, completion, from, to) {
    const line = view.state.doc.lineAt(to);
    const rest = line.text.slice(to - line.from);
    const end = to + IDENT.exec(rest)[0].length;
    const hasParen = view.state.doc.sliceString(end, end + 1) === '(';
    const insert = completion.label + (hasParen ? '' : completion.detail === '()' ? '()' : '(');
    view.dispatch({
        changes: { from, to: end, insert },
        selection: { anchor: from + insert.length + (hasParen ? 1 : 0) },
        annotations: pickedCompletion.of(completion),
        userEvent: 'input.complete'
    });
}

function toOptions(list, type) {
    return list.map(([label, params, summary]) => ({
        label, detail: params, info: summary || undefined, type, boost: 1, apply: applyCall
    }));
}

const lists = {};
const optionsFor = (key, type) => (lists[key] = lists[key] || toOptions(api[key] || [], type));

function memberMatch(context) {
    const line = context.state.doc.lineAt(context.pos);
    return MEMBER.exec(line.text.slice(0, context.pos - line.from));
}

function apiSource(context) {
    if (!inPhpCode(context.state, context.pos)) return null;
    const m = memberMatch(context);
    if (m) {
        const options = m[2] || m[1] === 'db()' ? optionsFor('db', 'method') : optionsFor('modx', 'method');
        return { from: context.pos - m[3].length, options, validFor: IDENT };
    }
    // 関数の一覧は、Ctrl+Space のときだけ
    if (!context.explicit) return null;
    const f = context.matchBefore(FUNCTION_BEFORE);
    // 変数（$x）や、ほかのもののメンバー（$obj->x・Foo::x）の名前を打っている途中なら出さない
    if (!f && context.matchBefore(/[$\w]$/)) return null;
    const name = f ? /\w*$/.exec(f.text)[0] : '';
    return { from: context.pos - name.length, options: optionsFor('functions', 'function'), validFor: IDENT };
}

// 文書の中の単語。打つたびに出す欄（テンプレートなど）でも、Ctrl+Space のときだけにする。
// -> のあとは API の一覧だけにする（同じ名前が二重に並ばないように）
function wordSource(context) {
    if (!context.explicit || memberMatch(context)) return null;
    return completeAnyWord(context);
}

/**
 * @param {object} o { php: Evolution の API を出すか, words: 文書の中の単語を出すか }
 * @returns {Array} 補完の元
 */
export function codeSources(o) {
    return [o.php ? apiSource : null, o.words ? wordSource : null].filter(Boolean);
}
