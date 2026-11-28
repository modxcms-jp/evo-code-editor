# Code Editor（evo-code-editor）

Evolution CMS JP Edition 1.3 の管理画面のコード欄を、CodeMirror 6 のエディタにするプラグイン（0.4.0）。
本体（`manager/`）は変えない。

## できること

### 編集

- 色分け（PHP・HTML・CSS・JavaScript・JSON・XML・SQL・Markdown と、ソースタグ）、行番号、折りたたみ、対応する括弧、検索と置換（Ctrl+F）、Tab での字下げ

### 補完

HTML・CSS などは打つたびに一覧を出す。JS・PHP などは Ctrl+Space で出す（改行の Enter が候補に取られないように）。

- **ソースタグ**: `{{` でチャンク、`[[`・`[!` でスニペット、`[*` で文書の項目とテンプレート変数、`[(` で設定のキーの名前を出し、選ぶと閉じの記号まで入れる。名前は、見る権限のあるエレメントのものだけ
- **HTML・CSS**: HTML のタグ・属性と CSS のプロパティ
- **バインディング**: テンプレート・チャンク・本文の先頭で `@` を打つと `@FILE`・`@INCLUDE`・`@URL` を出す。`@FILE:`・`@INCLUDE:` のあとは、サイトの直下からのファイルとディレクトリの名前を出す（`@FILE` は PHP 以外、`@INCLUDE` は PHP だけ）。`manager/`・ドットで始まる場所など、コアの `@FILE` が読まない場所は出さない
- **Evolution の API**: PHP（スニペット・プラグイン・モジュールと、PHP のファイル）で、`$modx->`・`evo()->` のあとは DocumentParser のメソッド、`db()->`・`$modx->db->` のあとは DBAPI のメソッド、ほかは `helpers.php` の関数。文字列・コメントの中では出さない
- **文書の中の単語**（変数名など）: どの欄でも Ctrl+Space で出す

### Emmet

テンプレート・本文と、HTML・CSS（SCSS・LESS）のファイルで、`ul>li*3`・`m10` のような省略記法を打つと、下線を引いて展開の結果を下に見せる。Tab で展開し、Esc で取り消す（候補の一覧が開いていれば 2 回）。

- 下線の無いところの Tab は字下げ
- 英単語も省略記法として扱うので、`hello` を打った直後の Tab は `<hello></hello>` になる（字下げしたいときは Esc で取り消してから）
- PHP の部分、ソースタグ、日本語の文には反応しない
- チャンクは HTML とは限らないので、既定では使わない。欄の上の「Emmet を使う」で切り替える（人ごとにブラウザで記憶）
- `!` で出す `<html lang="...">` は、管理画面の言語が日本語なら `ja`、ほかは `en`

### 切り替えとキーボード

- 欄の上のボタンで、素の欄との切り替え（人ごとにブラウザで記憶）
- キーボードだけで欄の外へ出るには、Esc のあとに Tab（ファイルの編集と TinyMCE のソースのダイアログは Esc で閉じるので、Ctrl+M のあとに Tab）

## 対象

| 画面 | 欄 |
|---|---|
| エレメント | テンプレート・チャンク・スニペット・プラグイン・モジュールのコード |
| ファイルマネージャー | テキストの表示・編集 |
| リッチテキスト（TinyMCE 7） | 「ソースコード」のダイアログの欄 |
| 投稿・下書き | 本文。リッチテキストが無効の記事と、エディタが「なし」のとき |

プロパティ・説明・テンプレート変数の欄と、リッチテキストエディタの編集欄は対象にしない。

### 1.2.x で使うとき

管理画面は壊れないが、使えるのは一部だけ。

- 使える: 投稿・下書きの本文、TinyMCE 7 のソースのダイアログ、バインディングの補完（ファイルの名前は 1.2.3J から）
- 素の欄のまま: エレメントとファイルマネージャーの欄（目印にしている画面の部品が 1.3 からのため）

## 入れ方

1. `assets/plugins/code-editor/` をサイトに置く
2. サイトの直下で `php install.php`。やめるときは `php install.php --disable`

前の版から上げるときも `php install.php` を流す（0.4.0 から、バインディングの補完に使う `OnManagerPageInit` も登録する）。

## 作り

元の `textarea` を正とし、見た目だけを替える。入力は `textarea` に書いて `input`・`change`・`blur` を伝え、`textarea.value` への代入はエディタに映す。開いただけでは値を書かない。エディタを作れなければ、元の `textarea` のまま使える。

- `src/index.js` 付け外し・切り替え ／ `targets.js` 対象の判定 ／ `bridge.js` `textarea` との橋渡し
- `src/setup.js` エディタの設定 ／ `languages.js`・`modxTags.js` 色分け ／ `style.css`
- `src/completion.js` 補完のまとめとソースタグ ／ `bindings.js` バインディング ／ `phpCompletion.js` Evolution の API と単語 ／ `emmet.js` Emmet
- `assets/plugins/code-editor/plugin.php` 設定と JS・CSS を `<head>` に出す（`OnManagerMainFrameHeaderHTMLBlock`）。バインディングの補完に、ディレクトリの中の名前を JSON で返す（`OnManagerPageInit`、`index.php?a=999&evo_code_editor=files`）

Evolution の API の一覧（`src/evoApi.json`）は、本体の版が上がったら、サイトの直下で `php <このリポジトリ>/tools/evo-api.php > <このリポジトリ>/src/evoApi.json` で作り直す。

組み立ては `npm ci && npm run build`。出力（`assets/plugins/code-editor/dist/`）もリポジトリに入れる。
同梱の CodeMirror 6 と Emmet は MIT ライセンス（`assets/plugins/code-editor/LICENSE-codemirror.txt`・`LICENSE-emmet.txt`）。

## ライセンス

GPL-2.0-or-later（`LICENSE`）。
