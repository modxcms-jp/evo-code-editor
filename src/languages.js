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

const extOf = (fileName) => ((/\.([a-z0-9]+)$/i.exec(fileName || '') || [])[1] || '').toLowerCase();
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
// Evolution の API を補完するファイル（PHP の中だけで出す）
const PHP_EXT = new Set(['php', 'inc', 'phtml']);
// Emmet を使うファイルと、その書き方
const EMMET = { html: 'html', htm: 'html', tpl: 'html', xhtml: 'html', phtml: 'html', css: 'css', scss: 'scss', less: 'less' };
const TYPING = new Set(['phtml', 'html', 'htm', 'tpl', 'xhtml', 'css', 'scss', 'less', 'xml', 'svg', 'rss', 'md', 'markdown']);

/**
 * @param {'php'|'html'|'file'} kind
 * @param {string} text 今の中身
 * @param {string} fileName kind が file のとき
 * @param {object} names 補完に使う名前（チャンク・スニペット・テンプレート変数・設定）
 * @param {object|null} bindings バインディングを補完するなら { lang, filesUrl }
 */
export function languageFor(kind, text, fileName, names, bindings) {
    // スニペット・プラグインなどの PHP。Evolution の API と単語は Ctrl+Space で出す
    if (kind === 'php') return [phpCode(text), completion({ typing: false, php: true, words: true })];
    if (kind === 'html') return [htmlCode(text), completion({ typing: true, tags: true, names, bindings, words: true })];
    const ext = extOf(fileName);
    const make = BY_EXT[ext];
    // .htaccess・.txt など、決まった文法の無いものは色を付けない
    if (!make) return [];
    return [make(text), completion({ typing: TYPING.has(ext), tags: make === htmlCode, names, php: PHP_EXT.has(ext), words: true })];
}

/**
 * Emmet の書き方。使わない欄・ファイルなら null
 * @param {'php'|'html'|'file'} kind
 * @param {string} fileName kind が file のとき
 */
export function emmetSyntax(kind, fileName) {
    if (kind === 'html') return 'html';
    if (kind !== 'file') return null;
    return EMMET[extOf(fileName)] || null;
}
