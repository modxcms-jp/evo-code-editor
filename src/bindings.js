import { pickedCompletion } from '@codemirror/autocomplete';

// バインディング（@FILE など）の補完。Evolution がバインディングとして読むのは欄の先頭だけなので、
// 1 行目の頭でだけ出す。テンプレート・チャンク・本文で効くのは @FILE・@INCLUDE・@URL（atBind()）

const DETAIL = {
    ja: { FILE: 'ファイルの中身', INCLUDE: 'PHP のファイルを実行した出力', URL: 'URL の中身' },
    en: { FILE: 'file contents', INCLUDE: 'output of a PHP file', URL: 'contents of a URL' }
};
// 値にファイルの名前を出すもの → サーバーに渡す種類（@FILE は PHP 以外、@INCLUDE は PHP だけ）
const FILE_MODE = { FILE: 'file', INCLUDE: 'include' };

const NAME_BEFORE = /^@[A-Za-z]*$/;
// 名前と値の区切りは 1 文字（: か空白）。値の前後の空白は Evolution が取り除く
const VALUE_BEFORE = /^@(FILE|INCLUDE)[: ][ \t]*(.*)$/;
const SEGMENT = /^[^/\s]*/;

function nameSource(lang) {
    const detail = DETAIL[lang] || DETAIL.en;
    const options = Object.keys(detail).map((name) => ({ label: '@' + name, detail: detail[name], type: 'keyword' }));
    return (context) => {
        const m = context.matchBefore(NAME_BEFORE);
        if (!m || m.from !== 0) return null;
        return { from: 0, options, validFor: NAME_BEFORE };
    };
}

function lister(url) {
    const cache = new Map();
    return (mode, dir) => {
        const key = mode + '\n' + dir;
        if (!cache.has(key)) {
            const promise = fetch(`${url}&mode=${mode}&path=${encodeURIComponent(dir)}`, {
                credentials: 'same-origin',
                headers: { Accept: 'application/json' }
            })
                .then((r) => (r.ok ? r.json() : null))
                // ログインが切れたときなどは HTML が返る。何も出さず、次に打ったときに問い合わせ直す
                .catch(() => null)
                .then((data) => {
                    if (!data || !Array.isArray(data.dirs) || !Array.isArray(data.files)) {
                        cache.delete(key);
                        return { dirs: [], files: [] };
                    }
                    return data;
                });
            cache.set(key, promise);
        }
        return cache.get(key);
    };
}

// 選んだ名前で、打ちかけのところ（次の / まで）を置き換える。ディレクトリなら、続けてその中の名前を出す
// （reopen。startCompletion で開くと明示の呼び出しになり、HTML の補完が本文の中でタグを全部出して、名前が埋もれる）
function applyEntry(isDir) {
    return (view, completion, from, to) => {
        const line = view.state.doc.lineAt(to);
        const rest = line.text.slice(to - line.from);
        const end = to + SEGMENT.exec(rest)[0].length;
        const name = completion.label.replace(/\/$/, '');
        const hasSlash = isDir && view.state.doc.sliceString(end, end + 1) === '/';
        const insert = name + (isDir && !hasSlash ? '/' : '');
        view.dispatch({
            changes: { from, to: end, insert },
            selection: { anchor: from + insert.length + (hasSlash ? 1 : 0) },
            annotations: pickedCompletion.of(completion),
            userEvent: 'input.complete'
        });
    };
}

function valueSource(url) {
    const list = lister(url);
    return async (context) => {
        const line = context.state.doc.lineAt(context.pos);
        if (line.number !== 1) return null;
        const m = VALUE_BEFORE.exec(line.text.slice(0, context.pos - line.from));
        if (!m) return null;
        const path = m[2];
        const slash = path.lastIndexOf('/');
        // サイトの直下からの場所として探す（先頭の / も同じ）
        const dir = slash < 0 ? '' : path.slice(0, slash + 1).replace(/^\/+/, '');
        const partial = path.slice(slash + 1);
        if (/\s/.test(partial)) return null;
        const data = await list(FILE_MODE[m[1]], dir);
        if (context.aborted) return null;
        const options = [
            ...data.dirs.map((name) => ({ label: name + '/', type: 'namespace', boost: 1, reopen: true, apply: applyEntry(true) })),
            ...data.files.map((name) => ({ label: name, type: 'text', apply: applyEntry(false) }))
        ];
        if (!options.length) return null;
        return { from: context.pos - partial.length, options, validFor: SEGMENT };
    };
}

/**
 * @param {object} o { lang, filesUrl: ディレクトリの中の名前を返す口（無ければ値は補完しない） }
 * @returns {Array} 補完の元
 */
export function bindingSources(o) {
    return [nameSource(o.lang), o.filesUrl ? valueSource(o.filesUrl) : null].filter(Boolean);
}
