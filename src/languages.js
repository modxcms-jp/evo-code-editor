import { php } from '@codemirror/lang-php';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { sql } from '@codemirror/lang-sql';
import { markdown } from '@codemirror/lang-markdown';
import { modxTags } from './modxTags.js';
import { completion } from './completion.js';
import { tagLint } from './tagLint.js';

const startsWithTag = (text) => /^\s*<\?/.test(text);

// タグは自動で閉じない（手で閉じると二重になる）。php() は、素のままだと自動で閉じる HTML を含む
const htmlBase = html({ selfClosingTags: true, autoCloseTags: false });
// PHP・Markdown の中の HTML は、開きタグと閉じタグが別のところ（PHP の出力・別の段落）にあってよいので、対応を調べない
const htmlNoMatch = html({ selfClosingTags: true, autoCloseTags: false, matchClosingTags: false });

// 開始タグの無い PHP（スニペットなど）は plain、あれば HTML の中の PHP として読む。ファイルは先頭が HTML のこともあるので、いつも後者
const phpInHtml = () => php({ baseLanguage: htmlNoMatch.language });
const phpFile = () => [phpInHtml()];
const phpCode = (text) => startsWithTag(text) ? phpFile() : [php({ plain: true, baseLanguage: null })];
// テンプレート・チャンク・本文・HTML のファイル。PHP の開始タグがあれば PHP も読む
const htmlCode = (text) => [/<\?(php|=)/i.test(text) ? phpInHtml() : htmlBase, modxTags];

const BY_EXT = {
    php: phpFile, inc: phpFile, phtml: htmlCode,
    html: htmlCode, htm: htmlCode, tpl: htmlCode, xhtml: htmlCode,
    css: () => [css()],
    js: () => [javascript()], mjs: () => [javascript()], cjs: () => [javascript()],
    ts: () => [javascript({ typescript: true })],
    json: () => [json()], map: () => [json()],
    xml: () => [xml({ autoCloseTags: false })], svg: () => [xml({ autoCloseTags: false })], rss: () => [xml({ autoCloseTags: false })],
    sql: () => [sql()],
    md: () => [markdown({ htmlTagLanguage: htmlNoMatch })], markdown: () => [markdown({ htmlTagLanguage: htmlNoMatch })],
    // SCSS・LESS は、専用の文法を入れず CSS として読む（入れ子などは素の色になる）
    scss: () => [css()], less: () => [css()]
};

// 打つたびに補完の一覧を出すもの（ほかは Ctrl+Space で出す）。書き手が候補から選ぶことの多い、タグやプロパティの言語
const TYPING = new Set(['phtml', 'html', 'htm', 'tpl', 'xhtml', 'css', 'scss', 'less', 'xml', 'svg', 'rss', 'md', 'markdown']);

/**
 * @param {'php'|'html'|'file'} kind
 * @param {string} text 今の中身
 * @param {string} fileName kind が file のとき
 * @param {object} o { names: 補完と検査に使う名前（チャンク・スニペット・テンプレート変数・設定）, lang }
 */
export function languageFor(kind, text, fileName, o = {}) {
    const { names } = o;
    // スニペット・プラグインなどの PHP には、補完の元が無い
    if (kind === 'php') return phpCode(text);
    if (kind === 'html') return [htmlCode(text), completion({ typing: true, tags: true, names }), tagLint(o)];
    const ext = ((/\.([a-z0-9]+)$/i.exec(fileName || '') || [])[1] || '').toLowerCase();
    const make = BY_EXT[ext];
    // .htaccess・.txt など、決まった文法の無いものは色を付けない
    if (!make) return [];
    const tags = make === htmlCode;
    return [make(text), completion({ typing: TYPING.has(ext), tags, names }), tags ? tagLint(o) : []];
}
