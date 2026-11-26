<?php
/**
 * Code Editor を登録する（コマンドライン）。何度流しても同じ結果になる。
 *
 *   cd <サイトの直下> && php <このファイル> [--disable]
 *
 * 先に assets/plugins/code-editor/ を置いておく。--disable で、元の素の欄に戻る。
 */
if (PHP_SAPI !== 'cli') {
    exit(1);
}
$disable = in_array('--disable', $argv, true);
define('MODX_API_MODE', true);
include getcwd() . '/index.php';
$modx->db->connect();

$name = 'Code Editor';
$event = 'OnManagerMainFrameHeaderHTMLBlock';
$id = (int) $modx->db->getValue($modx->db->select('id', '[+prefix+]site_plugins', "name='{$name}'"));

if ($disable) {
    if ($id) {
        $modx->db->update(['disabled' => 1], '[+prefix+]site_plugins', "id={$id}");
    }
    $modx->clearCache('full');
    echo $id ? "plugin: id={$id} を無効にした\n" : "plugin: 無い\n";
    exit(0);
}
if (!is_file(MODX_BASE_PATH . 'assets/plugins/code-editor/plugin.php')) {
    fwrite(STDERR, "assets/plugins/code-editor/plugin.php が無い\n");
    exit(1);
}
$evt = (int) $modx->db->getValue($modx->db->select('id', '[+prefix+]system_eventnames', "name='{$event}'"));
if (!$evt) {
    fwrite(STDERR, "{$event} の出来事が無い\n");
    exit(1);
}
$fields = [
    'description' => $modx->db->escape('<strong>0.3.0</strong> コード欄の色分け（CodeMirror 6）'),
    'plugincode' => $modx->db->escape("\$f = MODX_BASE_PATH . 'assets/plugins/code-editor/plugin.php';\nif (is_file(\$f)) {\n    include \$f;\n}"),
    'disabled' => 0,
];
if ($id) {
    $modx->db->update($fields, '[+prefix+]site_plugins', "id={$id}");
} else {
    $fields['name'] = $name;
    $fields['properties'] = '';
    $id = (int) $modx->db->insert($fields, '[+prefix+]site_plugins');
}
if (!(int) $modx->db->getValue($modx->db->select('COUNT(*)', '[+prefix+]site_plugin_events', "pluginid={$id} AND evtid={$evt}"))) {
    $modx->db->insert(['pluginid' => $id, 'evtid' => $evt, 'priority' => 0], '[+prefix+]site_plugin_events');
}
$modx->clearCache('full');
echo "plugin: id={$id} を登録し、キャッシュを消した\n";
