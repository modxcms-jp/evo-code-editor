<?php
/**
 * Code Editor の入口。プラグイン（OnManagerMainFrameHeaderHTMLBlock）から読み込む。
 * 管理画面の <head> に、設定と自前の JS・CSS を出すだけ。画面の差し替え（シェルの断片）では呼ばれない。
 */
if (!isset($modx) || $modx->event->name !== 'OnManagerMainFrameHeaderHTMLBlock') {
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
$codeEditorNames = function ($table, $nameField, $detailField, $permission) use ($modx) {
    if (!$modx->hasPermission($permission)) {
        return [];
    }
    $rs = $modx->db->select("{$nameField} AS name, {$detailField} AS detail", "[+prefix+]{$table}", '', $nameField, 2000);
    $names = [];
    while ($row = $modx->db->getRow($rs)) {
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

$modx->event->output(implode("\n", array_filter([
    '<script>window.evoCodeEditorConfig=' . json_encode([
        'useEditor' => (string) config('use_editor') === '1',
        'lang' => strpos((string) config('manager_language', 'english'), 'japanese') === 0 ? 'ja' : 'en',
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
