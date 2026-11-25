import { Decoration, MatchDecorator, ViewPlugin } from '@codemirror/view';

// Evolution CMS のソースタグ。値のタグは丸ごと、スニペット呼び出しは始まり（名前まで）・引数の名前・終わりに印を付ける
// （呼び出しは何行にもわたり、中に別のタグが入るため）
const TAGS = [
    ['value', '\\[\\*[^\\n]*?\\*\\]'],
    ['setting', '\\[\\([^\\n]*?\\)\\]'],
    ['ph', '\\[\\+[^\\n]*?\\+\\]'],
    ['link', '\\[~[^\\n]*?~\\]'],
    ['info', '\\[\\^[^\\n]*?\\^\\]'],
    ['chunk', '\\{\\{[^\\n]*?\\}\\}'],
    ['call', '\\[(?:\\[|!)\\s*[^\\s?&\\[\\]!]*\\??'],
    ['call', '\\]\\]|!\\]'],
    ['param', '(?<=^|[\\s?])&[A-Za-z_][\\w-]*(?=\\s*=)']
];
const PATTERN = new RegExp(TAGS.map(([, re]) => `(${re})`).join('|'), 'g');
const MARKS = TAGS.map(([name]) => Decoration.mark({ class: `cm-modx cm-modx-${name}` }));

const decorator = new MatchDecorator({
    regexp: PATTERN,
    decoration: (match) => MARKS[match.slice(1).findIndex((m) => m !== undefined)]
});

export const modxTags = ViewPlugin.fromClass(class {
    constructor(view) {
        this.decorations = decorator.createDeco(view);
    }

    update(update) {
        this.decorations = decorator.updateDeco(update, this.decorations);
    }
}, { decorations: (v) => v.decorations });
