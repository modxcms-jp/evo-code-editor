//<?php
/**
 * Code Editor
 *
 * コード欄の色分け（CodeMirror 6）。エレメント・ファイル・リッチテキストを使わない本文
 *
 * @category    plugin
 * @version     0.3.0
 * @license     http://www.gnu.org/copyleft/gpl.html GNU Public License (GPL)
 * @internal    @events OnManagerMainFrameHeaderHTMLBlock,OnManagerPageInit
 * @internal    @modx_category Manager and Admin
 * @internal    @installset base
 */

// ファイルだけ無くなっても、管理画面を止めない
$f = MODX_BASE_PATH . 'assets/plugins/code-editor/plugin.php';
if (is_file($f)) {
    include $f;
}
