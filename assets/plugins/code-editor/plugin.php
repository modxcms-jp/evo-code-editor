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

$modx->event->output(implode("\n", array_filter([
    '<script>window.evoCodeEditorConfig=' . json_encode([
        'useEditor' => (string) config('use_editor') === '1',
        'lang' => strpos((string) config('manager_language', 'english'), 'japanese') === 0 ? 'ja' : 'en',
    ], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) . ';</script>',
    '<link rel="stylesheet" href="' . $codeEditorUrl('code-editor.css') . '">',
    '<script src="' . $js . '" defer></script>',
])));
