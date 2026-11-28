# Code Editor（evo-code-editor）

Evolution CMS JP Edition 1.3 の管理画面のコード欄を、CodeMirror 6 のエディタにするプラグイン（0.3.0）。
本体（`manager/`）は変えない。

- 色分け（PHP・HTML・CSS・JavaScript・JSON・XML・SQL・Markdown と、ソースタグ）、行番号、折りたたみ、対応する括弧、検索と置換（Ctrl+F）、Tab での字下げ
- 補完。`{{` でチャンク、`[[`・`[!` でスニペット、`[*` で文書の項目とテンプレート変数、`[(` で設定のキーの名前を出し、選ぶと閉じの記号まで入れる。HTML のタグ・属性と CSS のプロパティも出す。JS・PHP などは Ctrl+Space で出す（改行の Enter が候補に取られないように）。名前は、見る権限のあるエレメントのものだけ
- PHP（スニペット・プラグイン・モジュールと、PHP のファイル）では、Ctrl+Space で Evolution の API を出す。`$modx->`・`evo()->` のあとは DocumentParser のメソッド、`db()->`・`$modx->db->` のあとは DBAPI のメソッド、ほかは `helpers.php` の関数。文字列・コメントの中では出さない
- 文書の中の単語（変数名など）は、どの欄でも Ctrl+Space で出す
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

## 入れ方

1. `assets/plugins/code-editor/` をサイトに置く
2. サイトの直下で `php install.php`。やめるときは `php install.php --disable`

## 作り

元の `textarea` を正とし、見た目だけを替える。入力は `textarea` に書いて `input`・`change`・`blur` を伝え、`textarea.value` への代入はエディタに映す。開いただけでは値を書かない。エディタを作れなければ、元の `textarea` のまま使える。

- `src/index.js` 付け外し・切り替え ／ `targets.js` 対象の判定 ／ `bridge.js` `textarea` との橋渡し
- `src/setup.js` エディタの設定 ／ `languages.js`・`modxTags.js` 色分け ／ `completion.js`・`phpCompletion.js` 補完 ／ `style.css`

Evolution の API の一覧（`src/evoApi.json`）は、本体の版が上がったら、サイトの直下で `php <このリポジトリ>/tools/evo-api.php > <このリポジトリ>/src/evoApi.json` で作り直す。

組み立ては `npm ci && npm run build`。出力（`assets/plugins/code-editor/dist/`）もリポジトリに入れる。
同梱の CodeMirror 6 は MIT ライセンス（`assets/plugins/code-editor/LICENSE-codemirror.txt`）。

## ライセンス

GPL-2.0-or-later（`LICENSE`）。
