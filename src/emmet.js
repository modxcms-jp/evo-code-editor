import { Prec } from '@codemirror/state';
import { abbreviationTracker } from '@emmetio/codemirror6-plugin';

// Emmet。打っている省略記法（ul>li*3 など）に下線を引いて展開の結果を下に見せ、Tab で展開する。
// 下線が無いところの Tab は、今までどおり字下げ。Esc で取り消す（候補の一覧が開いていれば、1 回目はそれを閉じる）。
// Evolution のタグ（[[...]]・{{...}}・[*...*]）や日本語の文には反応しない

/**
 * @param {'html'|'css'|'scss'|'less'} syntax
 * @param {string} lang 管理画面の言語（ja・en）。! で出す <html lang="..."> に使う
 */
export function emmet(syntax, lang) {
    // 字下げの Tab（setup.js）より先に、下線のある省略記法の展開を試す
    // CSS では Emmet の候補が補完の一覧にも出る。一覧が開いていても、Tab でその候補を決めて展開する
    return Prec.high(abbreviationTracker({
        syntax, attributeQuotes: 'double', markupStyle: 'html',
        autocompleteTab: ['stylesheet'],
        config: { markup: { variables: { lang: lang === 'ja' ? 'ja' : 'en' } } }
    }));
}
