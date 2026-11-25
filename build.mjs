import { build } from 'esbuild';

const out = 'assets/plugins/code-editor/dist';

await build({
    entryPoints: { 'code-editor': 'src/index.js' },
    outdir: out,
    bundle: true,
    minify: true,
    // シェルは document.write で文書を差し替えることがあるので、モジュールにせず、読まれるたびに動く形にする
    format: 'iife',
    target: ['es2020'],
    legalComments: 'linked',
    logLevel: 'info'
});
await build({
    entryPoints: { 'code-editor': 'src/style.css' },
    outdir: out,
    minify: true,
    logLevel: 'info'
});
