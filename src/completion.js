import { EditorState } from '@codemirror/state';
import { autocompletion, pickedCompletion } from '@codemirror/autocomplete';
import { bindingSources } from './bindings.js';

// 補完。一覧を打つたびに出すのは、HTML・CSS などの書き手が候補から選ぶことの多いものだけ。
// JS・PHP などは、改行の Enter が候補に取られないよう、Ctrl+Space で出したときだけにする

// 文書の項目（site_content の列）。テンプレート変数の名前は、サーバーから受け取る
const FIELDS = [
    'id', 'pagetitle', 'longtitle', 'description', 'alias', 'link_attributes', 'introtext', 'content', 'menutitle',
    'parent', 'template', 'menuindex', 'published', 'pub_date', 'unpub_date', 'publishedon', 'publishedby',
    'isfolder', 'richtext', 'searchable', 'cacheable', 'hidemenu', 'alias_visible', 'donthit', 'type', 'contentType',
    'content_dispo', 'privateweb', 'privatemgr', 'createdby', 'createdon', 'editedby', 'editedon',
    'deleted', 'deletedon', 'deletedby'
];

// 開きの記号 → 閉じの記号と、出す候補の種類
const TAGS = {
    '{{': { close: '}}', lists: ['chunks'] },
    '[[': { close: ']]', lists: ['snippets'] },
    '[!': { close: '!]', lists: ['snippets'] },
    '[*': { close: '*]', lists: ['fields', 'tvs'] },
    '[(': { close: ')]', lists: ['settings'] }
};
// 名前に使える文字（日本語の名前も通す）。[*#pagetitle*] の # は名前に含めない
const NAME = '[^\\s{}\\[\\]()*!?&:=`"\'<>]*';
const BEFORE = new RegExp(`(\\{\\{|\\[\\[|\\[!|\\[\\*#?|\\[\\()(${NAME})$`);
const VALID = new RegExp(`^${NAME}$`);
const TAIL = new RegExp(`^${NAME}`);

function options(names, close) {
    const make = (type) => ([label, detail]) => ({ label, detail: detail || undefined, type, apply: applyWith(close) });
    const lists = {
        chunks: (names.chunks || []).map(make('constant')),
        snippets: (names.snippets || []).map(make('function')),
        fields: FIELDS.map((f) => [f]).map(make('property')),
        tvs: (names.tvs || []).map(make('variable')),
        settings: (names.settings || []).map(make('keyword'))
    };
    return (keys) => keys.flatMap((k) => lists[k]);
}

// 名前と閉じの記号を入れる。後ろに続く名前の残りも置き換える。
// その後ろが閉じの記号・引数（?・&）・モディファイア（:）なら、すでにあるタグの名前の打ち直しなので、名前だけ入れる
function applyWith(close) {
    return (view, completion, from, to) => {
        const line = view.state.doc.lineAt(to);
        const rest = line.text.slice(to - line.from);
        const end = to + TAIL.exec(rest)[0].length;
        const next = rest.slice(end - to);
        const insert = completion.label + (next.startsWith(close) || /^\s*[?&:]/.test(next) ? '' : close);
        view.dispatch({
            changes: { from, to: end, insert },
            selection: { anchor: from + insert.length },
            annotations: pickedCompletion.of(completion),
            userEvent: 'input.complete'
        });
    };
}

function tagSource(names) {
    const cache = {};
    const listFor = (open) => {
        const tag = TAGS[open];
        if (!cache[open]) cache[open] = options(names, tag.close)(tag.lists);
        return cache[open];
    };
    return (context) => {
        const m = context.matchBefore(BEFORE);
        if (!m) return null;
        const [, open, name] = /^(\{\{|\[\[|\[!|\[\*#?|\[\()(.*)$/s.exec(m.text);
        const list = listFor(open.replace('#', ''));
        if (!list.length) return null;
        return { from: m.to - name.length, options: list, validFor: VALID };
    };
}

/**
 * @param {object} o {
 *   typing: 打つたびに一覧を出すか, tags: Evolution のタグを補完するか, names: サーバーから受け取った名前,
 *   bindings: バインディングを補完するなら { lang, filesUrl }
 * }
 */
export function completion(o) {
    // 補完の元は 1 つだけ作る（CodeMirror は関数そのもので元を見分けるので、読むたびに作ると結果が捨てられる）
    const sources = [
        ...(o.tags ? [tagSource(o.names || {})] : []),
        ...(o.bindings ? bindingSources(o.bindings) : [])
    ];
    const data = sources.length ? sources.map((autocomplete) => ({ autocomplete })) : null;
    return [
        autocompletion({ activateOnTyping: o.typing, activateOnCompletion: (c) => c.reopen === true, maxRenderedOptions: 200 }),
        data ? EditorState.languageData.of(() => data) : []
    ];
}
