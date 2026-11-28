<?php
/**
 * Code Editor の入口。プラグインから読み込む。
 * - OnManagerMainFrameHeaderHTMLBlock: 管理画面の <head> に、設定と自前の JS・CSS を出す。画面の差し替え（シェルの断片）では呼ばれない
 * - OnManagerPageInit: バインディング（@FILE・@INCLUDE）の補完に、ディレクトリの中の名前を JSON で返す
 */
if (!function_exists('evo')) {
    return;
}
if (evo()->event->name === 'OnManagerPageInit') {
    if (!isset($_GET['evo_code_editor']) || $_GET['evo_code_editor'] !== 'files') {
        return;
    }
    $codeEditorFiles = function ($rel, $mode) {
        $empty = ['dirs' => [], 'files' => []];
        if (!(evo()->hasPermission('edit_document') || evo()->hasPermission('edit_template') || evo()->hasPermission('edit_chunk'))) {
            return $empty;
        }
        // 場所の判定はコアの @FILE と同じもの（サイトの直下だけ・manager/ とドットで始まる場所・読ませない場所を除く）を使う
        if (!method_exists(evo(), 'resolveBindDirPath')) {
            return $empty;
        }
        $rel = trim(str_replace('\\', '/', (string) $rel), '/');
        if (strpos($rel, "\0") !== false) {
            return $empty;
        }
        $dir = evo()->resolveBindDirPath(MODX_BASE_PATH . $rel);
        if ($dir === false) {
            return $empty;
        }
        $base = rtrim(str_replace('\\', '/', (string) realpath(MODX_BASE_PATH)), '/') . '/';
        $manager = realpath(MODX_MANAGER_PATH);
        $deny = method_exists(evo(), 'getBindDenyDirs') ? evo()->getBindDenyDirs() : [];
        if ($manager !== false) {
            $deny[] = strtolower(rtrim(str_replace('\\', '/', $manager), '/')) . '/';
        }
        // 1 件ずつコアの判定を呼ぶと、読ませない場所の一覧を毎回作り直すので、同じ判定をここで行う
        $allowed = function ($real) use ($base, $deny) {
            $real = str_replace('\\', '/', $real);
            if (strpos($real, $base) !== 0) {
                return false;
            }
            foreach (explode('/', substr($real, strlen($base))) as $segment) {
                if (strpos($segment, '.') === 0) {
                    return false;
                }
            }
            $lower = strtolower($real);
            foreach ($deny as $d) {
                if (strpos($lower . '/', $d) === 0) {
                    return false;
                }
            }
            return true;
        };
        $names = @scandir($dir);
        if ($names === false) {
            return $empty;
        }
        $result = $empty;
        foreach ($names as $name) {
            if ($name === '' || $name[0] === '.') {
                continue;
            }
            $real = realpath($dir . $name);
            if ($real === false || !$allowed($real)) {
                continue;
            }
            if (is_dir($real)) {
                $result['dirs'][] = $name;
            } elseif (is_file($real)) {
                // @FILE は PHP を読まない。@INCLUDE は PHP だけを読む
                $isPhp = strtolower(pathinfo($name, PATHINFO_EXTENSION)) === 'php';
                if ($isPhp === ($mode === 'include')) {
                    $result['files'][] = $name;
                }
            }
            if (count($result['dirs']) + count($result['files']) >= 2000) {
                break;
            }
        }
        natcasesort($result['dirs']);
        natcasesort($result['files']);
        return ['dirs' => array_values($result['dirs']), 'files' => array_values($result['files'])];
    };
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode(
        $codeEditorFiles(isset($_GET['path']) ? $_GET['path'] : '', isset($_GET['mode']) ? $_GET['mode'] : 'file'),
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE
    );
    exit;
}
if (evo()->event->name !== 'OnManagerMainFrameHeaderHTMLBlock') {
    return;
}

$codeEditorUrl = function ($file) {
    $path = 'assets/plugins/code-editor/dist/' . $file;
    return is_file(MODX_BASE_PATH . $path)
        ? hsc(MODX_BASE_URL . $path . '?' . filemtime(MODX_BASE_PATH . $path))
        : '';
};
$js = $codeEditorUrl('code-editor.js');
if ($js === '') {
    return;
}

// 補完に使う名前と、説明の先頭。見る権限のあるエレメントだけを渡す
$codeEditorNames = function ($table, $nameField, $detailField, $permission) {
    if (!evo()->hasPermission($permission)) {
        return [];
    }
    $rs = db()->select("{$nameField} AS name, {$detailField} AS detail", "[+prefix+]{$table}", '', $nameField, 2000);
    $names = [];
    while ($row = db()->getRow($rs)) {
        $names[] = [(string) $row['name'], mb_substr(trim(strip_tags((string) $row['detail'])), 0, 60)];
    }
    return $names;
};
$codeEditorSettings = $codeEditorNames('system_settings', 'setting_name', "''", 'settings');
if ($codeEditorSettings) {
    // DB に無く、読み込みのときに決まる設定
    foreach (['site_url', 'base_url', 'base_path'] as $key) {
        $codeEditorSettings[] = [$key, ''];
    }
}

evo()->event->output(implode("\n", array_filter([
    '<script>window.evoCodeEditorConfig=' . json_encode([
        'useEditor' => (string) config('use_editor') === '1',
        'lang' => strpos((string) config('manager_language', 'english'), 'japanese') === 0 ? 'ja' : 'en',
        // バインディングの値の補完に使う一覧の口。プラグインが OnManagerPageInit にも登録されているときだけ
        'filesUrl' => in_array(evo()->event->activePlugin, isset(evo()->pluginEvent['OnManagerPageInit']) ? (array) evo()->pluginEvent['OnManagerPageInit'] : [], true)
            ? MODX_MANAGER_URL . 'index.php?a=999&evo_code_editor=files'
            : '',
        'names' => [
            'chunks' => $codeEditorNames('site_htmlsnippets', 'name', 'description', 'edit_chunk'),
            'snippets' => $codeEditorNames('site_snippets', 'name', 'description', 'edit_snippet'),
            'tvs' => $codeEditorNames('site_tmplvars', 'name', 'caption', 'edit_template'),
            'settings' => $codeEditorSettings,
        ],
    ], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_INVALID_UTF8_SUBSTITUTE) . ';</script>',
    '<link rel="stylesheet" href="' . $codeEditorUrl('code-editor.css') . '">',
    '<script src="' . $js . '" defer></script>',
])));
