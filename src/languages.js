import { php } from '@codemirror/lang-php';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { sql } from '@codemirror/lang-sql';
import { markdown } from '@codemirror/lang-markdown';
import { modxTags } from './modxTags.js';

const startsWithTag = (text) => /^\s*<\?/.test(text);

// 開始タグの無い PHP（スニペットなど）は plain、あれば HTML の中の PHP として読む
const phpCode = (text) => [php({ plain: !startsWithTag(text) })];
// テンプレート・チャンク・本文・HTML のファイル。PHP の開始タグがあれば PHP も読む
const htmlCode = (text) => [/<\?(php|=)/i.test(text) ? php() : html({ selfClosingTags: true }), modxTags];

const BY_EXT = {
    php: phpCode, inc: phpCode, phtml: htmlCode,
    html: htmlCode, htm: htmlCode, tpl: htmlCode, xhtml: htmlCode,
    css: () => [css()],
    js: () => [javascript({ jsx: true })], mjs: () => [javascript({ jsx: true })], cjs: () => [javascript()],
    ts: () => [javascript({ typescript: true })],
    json: () => [json()], map: () => [json()],
    xml: () => [xml()], svg: () => [xml()], rss: () => [xml()],
    sql: () => [sql()],
    md: () => [markdown()], markdown: () => [markdown()],
    // SCSS・LESS は、専用の文法を入れず CSS として読む（入れ子などは素の色になる）
    scss: () => [css()], less: () => [css()]
};

/**
 * @param {'php'|'html'|'file'} kind
 * @param {string} text 今の中身
 * @param {string} fileName kind が file のとき
 */
export function languageFor(kind, text, fileName) {
    if (kind === 'php') return phpCode(text);
    if (kind === 'html') return htmlCode(text);
    const ext = (/\.([a-z0-9]+)$/i.exec(fileName || '') || [])[1];
    const make = ext ? BY_EXT[ext.toLowerCase()] : null;
    // .htaccess・.txt など、決まった文法の無いものは色を付けない
    return make ? make(text) : [];
}
