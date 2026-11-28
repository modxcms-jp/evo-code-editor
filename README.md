# Code Editor（evo-code-editor）

Evolution CMS JP Edition 1.3 の管理画面に、CodeMirror 6 を使用したコードエディタを導入するプラグインです。

シンタックスハイライト、コード補完、Emmet などの機能に対応しています。Evolution CMS 本体（`manager/`）のファイルを変更することなく導入できます。

- バージョン：0.4.0
- 対応環境：Evolution CMS JP Edition 1.3（1.2.x では一部機能のみ対応）

## 主な機能

### コード編集

- シンタックスハイライト（PHP・HTML・CSS・JavaScript・JSON・XML・SQL・Markdown・ソースタグ）
- 行番号の表示
- コードの折りたたみ
- 対応する括弧の強調表示
- 検索・置換（Ctrl+F）
- Tab キーによるインデント

### コード補完

HTML・CSS などでは、入力に応じて補完候補を自動表示します。

JavaScript・PHP などでは、Enter キーによる改行操作と補完候補の確定が競合しないよう、Ctrl+Space で補完候補を表示する仕様としています。

#### ソースタグ

Evolution CMS のソースタグに対応した補完機能を提供します。

| 入力 | 補完対象 |
|---|---|
| `{{` | チャンク |
| `[[`・`[!` | スニペット |
| `[*` | ドキュメントフィールド・テンプレート変数 |
| `[(` | システム設定のキー |

補完候補を選択すると、ソースタグの終了記号も自動挿入されます。

補完候補には、ログイン中のユーザーが編集権限を持つエレメントのみ表示されます。

#### HTML・CSS

HTML のタグ・属性および CSS のプロパティの補完に対応しています。

#### バインディング

テンプレート・チャンク・本文の先頭で `@` を入力すると、以下の補完候補が表示されます。

- `@FILE`
- `@INCLUDE`
- `@URL`

`@FILE:`・`@INCLUDE:` に続けて、サイトルートを基準としたファイル名およびディレクトリ名を補完できます。

- `@FILE`：PHP 以外のファイル
- `@INCLUDE`：PHP ファイル

`manager/` やドットで始まるパスなど、Evolution CMS 本体の `@FILE` で読み込み対象外となるパスは、補完候補に表示されません。

#### Evolution CMS API

スニペット・プラグイン・モジュールおよび PHP ファイルの編集時に、Evolution CMS の API を補完できます。

| 入力 | 補完対象 |
|---|---|
| `$modx->`・`evo()->` | DocumentParser のメソッド |
| `db()->`・`$modx->db->` | DBAPI のメソッド |
| その他 | `helpers.php` で定義されている関数 |

文字列やコメント内では API の補完候補を表示しません。

#### エディタ内の単語

すべての編集対象で、Ctrl+Space により編集中のテキストに含まれる単語（変数名など）を補完できます。

### Emmet

テンプレート・本文および HTML・CSS（SCSS・LESS を含む）ファイルの編集時に、Emmet を使用できます。

`ul>li*3` や `m10` などの省略記法を入力すると、該当箇所に下線が表示され、展開結果をプレビューできます。

- Tab：省略記法を展開
- Esc：展開候補をキャンセル（コード補完の候補一覧が表示されている場合は 2 回押す）
- 省略記法が認識されていない状態での Tab：通常のインデント

通常の英単語も省略記法として認識される場合があります。例えば、`hello` と入力した直後に Tab キーを押すと、`<hello></hello>` に展開されます。インデントを入力する場合は、Esc キーで展開候補をキャンセルしてください。

PHP コード、ソースタグ、日本語の文章は Emmet の展開対象外です。

チャンクは HTML 以外の用途にも使用されるため、デフォルトでは Emmet を無効にしています。エディタ上部の「Emmet を使う」から有効・無効を切り替えられます。設定はユーザーごとにブラウザに保存されます。

`!` による HTML のひな形展開では、管理画面の言語設定に応じて `html` 要素の `lang` 属性を設定します。日本語の場合は `ja`、それ以外の場合は `en` となります。

### エディタの切り替え

エディタ上部のボタンから、Code Editor と標準のテキストエリアを切り替えられます。

切り替え設定はユーザーごとにブラウザに保存されます。

### キーボード操作

キーボード操作でエディタの外へフォーカスを移動するには、Esc キーを押してから Tab キーを押してください。

ファイル編集画面および TinyMCE のソースコード編集ダイアログでは、Esc キーでダイアログが閉じるため、Ctrl+M を押してから Tab キーを押してください。

## 対象画面

| 画面 | 編集対象 |
|---|---|
| エレメント | テンプレート・チャンク・スニペット・プラグイン・モジュールのコード |
| ファイルマネージャー | テキストファイルの表示・編集 |
| リッチテキストエディタ（TinyMCE 7） | ソースコード編集ダイアログ |
| 投稿・下書き | 本文（リッチテキストが無効、またはエディタの設定が「なし」の場合） |

プロパティ、説明、テンプレート変数の入力欄およびリッチテキストエディタの通常の編集領域は対象外です。

### Evolution CMS JP Edition 1.2.x との互換性

1.2.x では、一部の機能のみ利用できます。

**利用可能な機能**

- 投稿・下書きの本文編集
- TinyMCE 7 のソースコード編集ダイアログ
- バインディングの補完（ファイル名の補完は 1.2.3J 以降）

**対象外となる画面**

- エレメントの編集画面
- ファイルマネージャーの編集画面

これらの画面では、1.3 で追加された画面要素を使用して編集対象を判定しているため、1.2.x では標準のテキストエリアが使用されます。

## インストール

管理画面からインストールする方法と、PHP の CLI を使用する方法があります。通常は管理画面からのインストールをおすすめします。

### 管理画面からインストールする

1. このリポジトリの `assets/plugins/code-editor/` フォルダを、FTP などでサイトの `assets/plugins/` に配置します。配置後のパスは `assets/plugins/code-editor/plugin.php` のようになります。
2. 管理画面にログインし、メニューの「エレメント」→「エレメント管理」を開きます。
3. 「プラグイン」タブの「プラグインを作成」をクリックします。
4. 「プラグイン名」に `Code Editor` と入力します。
5. 「プラグイン コード」に、以下のコードを貼り付けます。

    ```php
    $f = MODX_BASE_PATH . 'assets/plugins/code-editor/plugin.php';
    if (is_file($f)) {
        include $f;
    }
    ```

6. 「システムイベント」タブを開き、以下の 2 つにチェックを入れます。
    - `OnManagerMainFrameHeaderHTMLBlock`
    - `OnManagerPageInit`
7. 「更新」をクリックして保存します。

保存後、テンプレートやチャンクの編集画面を開き直すと、Code Editor が使用できます。

### PHP の CLI でインストールする

サーバーで PHP の CLI を実行できる場合は、付属の `install.php` でプラグインを登録できます。

1. `assets/plugins/code-editor/` フォルダを、サイトの `assets/plugins/` に配置します。
2. このリポジトリの直下にある `install.php` を、サイトルート（Evolution CMS の `index.php` があるディレクトリ）に配置します。
3. サイトルートで以下のコマンドを実行します。

```bash
php install.php
```

`install.php` は何度実行しても同じ結果になります。

### アップデート

`assets/plugins/code-editor/` フォルダを新しいバージョンのもので上書きします。

0.3.0 以前から 0.4.0 以降にアップデートする場合は、バインディングの補完に使用するイベント `OnManagerPageInit` の登録が必要です。

- 管理画面の場合：「Code Editor」プラグインの編集画面を開き、「システムイベント」タブで `OnManagerPageInit` にチェックを入れて「更新」をクリックします。
- CLI の場合：新しい `install.php` で `php install.php` を再実行します。

### 無効化

- 管理画面の場合：「Code Editor」プラグインの編集画面を開き、「設定」タブの「プラグインを停止」にチェックを入れて「更新」をクリックします。
- CLI の場合：サイトルートで `php install.php --disable` を実行します。

無効化すると、各編集画面は標準のテキストエリアに戻ります。

## 開発者向け情報

### 実装方針

元の `textarea` をデータの保持元とし、編集インターフェースを CodeMirror に置き換えています。

CodeMirror での入力内容は `textarea` に反映され、`input`・`change`・`blur` イベントが連携されます。また、`textarea.value` に対する代入も CodeMirror に反映されます。

エディタの初期化時には、元の値を書き換えません。

CodeMirror の初期化に失敗した場合は、標準の `textarea` を引き続き使用できます。

### ソースコード構成

| ファイル | 役割 |
|---|---|
| `src/index.js` | エディタの初期化・解除・切り替え |
| `src/targets.js` | 編集対象の判定 |
| `src/bridge.js` | `textarea` と CodeMirror の連携 |
| `src/setup.js` | エディタの設定 |
| `src/languages.js` | 言語ごとのシンタックスハイライト |
| `src/modxTags.js` | ソースタグのシンタックスハイライト |
| `src/style.css` | エディタのスタイル |
| `src/completion.js` | コード補完の統合・ソースタグの補完 |
| `src/bindings.js` | バインディングの補完 |
| `src/phpCompletion.js` | Evolution CMS API・単語の補完 |
| `src/emmet.js` | Emmet の処理 |
| `assets/plugins/code-editor/plugin.php` | プラグイン本体 |
| `install.php` | CLI でのプラグインの登録・無効化 |
| `tools/evo-api.php` | API 補完データの生成 |

### システムイベント

プラグインは以下のシステムイベントを使用します。

| イベント | 処理内容 |
|---|---|
| `OnManagerMainFrameHeaderHTMLBlock` | エディタの設定および JavaScript・CSS を `head` 要素内に出力 |
| `OnManagerPageInit` | バインディングの補完に使用するファイル・ディレクトリの一覧を JSON 形式で返却 |

バインディングの補完には、以下のエンドポイントを使用します。

```text
index.php?a=999&evo_code_editor=files
```

`OnManagerPageInit` が登録されていない場合、バインディングの名前は補完されますが、ファイル名・ディレクトリ名は補完されません。

### API 補完データの更新

Evolution CMS API の補完データは `src/evoApi.json` に格納されています。

Evolution CMS 本体のバージョンを更新した場合は、サイトルートで以下のコマンドを実行し、補完データを再生成してください。

```bash
php <このリポジトリ>/tools/evo-api.php > <このリポジトリ>/src/evoApi.json
```

`<このリポジトリ>` は、リポジトリの配置先のパスに置き換えてください。

### ビルド

リポジトリのルートディレクトリで以下のコマンドを実行します。

```bash
npm ci
npm run build
```

ビルド成果物は以下のディレクトリに出力されます。

```text
assets/plugins/code-editor/dist/
```

ビルド成果物もリポジトリの管理対象としています。

## ライセンス

本プラグインは GPL-2.0-or-later ライセンスで公開されています。詳細は `LICENSE` を参照してください。

同梱の CodeMirror 6 および Emmet は MIT ライセンスで提供されています。

- `assets/plugins/code-editor/LICENSE-codemirror.txt`
- `assets/plugins/code-editor/LICENSE-emmet.txt`
