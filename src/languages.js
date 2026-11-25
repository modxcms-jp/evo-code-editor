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

// タグは自動で閉じない（手で閉じると二重になる）。php() は、素のままだと自動で閉じる HTML を含む
const htmlBase = html({ selfClosingTags: true, autoCloseTags: false });

// 開始タグの無い PHP（スニペットなど）は plain、あれば HTML の中の PHP として読む。ファイルは先頭が HTML のこともあるので、いつも後者
const phpFile = () => [php({ baseLanguage: htmlBase.language })];
const phpCode = (text) => startsWithTag(text) ? phpFile() : [php({ plain: true, baseLanguage: null })];
// テンプレート・チャンク・本文・HTML のファイル。PHP の開始タグがあれば PHP も読む
const htmlCode = (text) => [/<\?(php|=)/i.test(text) ? php({ baseLanguage: htmlBase.language }) : htmlBase, modxTags];

const BY_EXT = {
    php: phpFile, inc: phpFile, phtml: htmlCode,
    html: htmlCode, htm: htmlCode, tpl: htmlCode, xhtml: htmlCode,
    css: () => [css()],
    js: () => [javascript()], mjs: () => [javascript()], cjs: () => [javascript()],
    ts: () => [javascript({ typescript: true })],
    json: () => [json()], map: () => [json()],
    xml: () => [xml({ autoCloseTags: false })], svg: () => [xml({ autoCloseTags: false })], rss: () => [xml({ autoCloseTags: false })],
    sql: () => [sql()],
    md: () => [markdown({ htmlTagLanguage: htmlBase })], markdown: () => [markdown({ htmlTagLanguage: htmlBase })],
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
