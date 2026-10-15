# @gtk-js/icon-helpers

## [0.1.6](https://github.com/gtk-js/gtk-js/compare/icon-helpers-v0.1.5...icon-helpers-v0.1.6) (2026-10-15)


### Features

* add expand, tooltips, icon fallback and native widget layout ([#45](https://github.com/gtk-js/gtk-js/issues/45)) ([cbd75ef](https://github.com/gtk-js/gtk-js/commit/cbd75ef0d6d98bf47c9c12a7a5184b0512e91b90))


### Bug Fixes

* ship libadwaita's own icons, render GtkButton icon-name icons, build icons deterministically ([#35](https://github.com/gtk-js/gtk-js/issues/35)) ([36d9619](https://github.com/gtk-js/gtk-js/commit/36d96199f87e6f70e4f97436805b98ee23cdb1e9))

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
