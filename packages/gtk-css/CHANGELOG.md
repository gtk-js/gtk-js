# @gtk-js/gtk-css

## [0.1.7](https://github.com/gtk-js/gtk-js/compare/gtk-css-v0.1.6...gtk-css-v0.1.7) (2026-10-16)


### Bug Fixes

* draw text selection in the theme's colors ([#59](https://github.com/gtk-js/gtk-js/issues/59)) ([33b0a88](https://github.com/gtk-js/gtk-js/commit/33b0a88f3b074148be544277278803e8d5a055b0))

## [0.1.6](https://github.com/gtk-js/gtk-js/compare/gtk-css-v0.1.5...gtk-css-v0.1.6) (2026-10-15)


### Features

* add GtkPopoverMenu and anchored menu button popovers ([#38](https://github.com/gtk-js/gtk-js/issues/38)) ([3d5f6f7](https://github.com/gtk-js/gtk-js/commit/3d5f6f70ea9e007d4050d6a78e77f33a10870acd))


### Bug Fixes

* follow GTK CSS for border-spacing, fonts, line height, links, :disabled, specificity and transitions ([#36](https://github.com/gtk-js/gtk-js/issues/36)) ([bc00d61](https://github.com/gtk-js/gtk-js/commit/bc00d6136b666c6d5463d1f1b7f11899536e355e))

## 0.1.3

### Patch Changes

- 4b57fdb: Bundle packages with `bun build` before publishing. CSS text imports (`with { type: "text" }`) are now inlined as string literals, fixing compatibility with Vite and other bundlers that don't support import attributes. Package exports now point to compiled ESM with `.d.ts` declarations rather than raw TypeScript source.

## 0.1.2

## 0.1.1

### Patch Changes

- 0982123: Bump all packages past burned npm versions

## 0.2.0

## 0.1.0

### Minor Changes

- f9da446: Testing CI publishing
