<?php
/**
 * 補完に使う Evolution の API の一覧（src/evoApi.json）を作る（コマンドライン）。
 *
 *   cd <サイトの直下> && php <このファイル> > <このリポジトリ>/src/evoApi.json
 *
 * DocumentParser（$modx・evo()）と DBAPI（db()・$modx->db）の public なメソッドと、helpers.php の関数を出す。
 * 非推奨（@deprecated）と、_ で始まる内部向けのものは出さない。
 */
if (PHP_SAPI !== 'cli') {
    exit(1);
}
define('MODX_API_MODE', true);
include getcwd() . '/index.php';

function evoApiSummary($doc)
{
    if (!$doc) {
        return '';
    }
    foreach (preg_split('/\R/', $doc) as $line) {
        $line = trim(preg_replace('#^\s*(/\*\*|\*/|\*)#', '', $line));
        if ($line !== '' && $line[0] !== '@') {
            return mb_substr($line, 0, 60);
        }
    }
    return '';
}

function evoApiParams(ReflectionFunctionAbstract $f)
{
    $params = [];
    foreach ($f->getParameters() as $p) {
        $s = ($p->isVariadic() ? '...' : '') . '$' . $p->getName();
        if ($p->isDefaultValueAvailable()) {
            $v = $p->getDefaultValue();
            $s .= ' = ' . (is_array($v) ? '[]' : str_replace("\n", ' ', var_export($v, true)));
        }
        $params[] = $s;
    }
    return '(' . implode(', ', $params) . ')';
}

function evoApiUsable(ReflectionFunctionAbstract $f)
{
    $doc = (string) $f->getDocComment();
    return strpos($f->getName(), '_') !== 0 && stripos($doc, '@deprecated') === false;
}

function evoApiMethods($class)
{
    $list = [];
    foreach ((new ReflectionClass($class))->getMethods(ReflectionMethod::IS_PUBLIC) as $m) {
        if ($m->isConstructor() || $m->isDestructor() || $m->isStatic() || !evoApiUsable($m)) {
            continue;
        }
        $list[$m->getName()] = [$m->getName(), evoApiParams($m), evoApiSummary($m->getDocComment())];
    }
    ksort($list, SORT_NATURAL | SORT_FLAG_CASE);
    return array_values($list);
}

$functions = [];
$helpers = realpath(MODX_CORE_PATH . 'helpers.php');
foreach (get_defined_functions()['user'] as $name) {
    $f = new ReflectionFunction($name);
    if ($f->getFileName() === $helpers && evoApiUsable($f)) {
        $functions[$f->getName()] = [$f->getName(), evoApiParams($f), evoApiSummary($f->getDocComment())];
    }
}
ksort($functions, SORT_NATURAL | SORT_FLAG_CASE);

echo json_encode([
    'version' => $modx->getVersionData('version'),
    'modx' => evoApiMethods(get_class($modx)),
    'db' => evoApiMethods(get_class($modx->db)),
    'functions' => array_values($functions),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE), "\n";
