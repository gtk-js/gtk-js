# @gtk-js/gtk4

## [0.1.6](https://github.com/gtk-js/gtk-js/compare/gtk4-v0.1.5...gtk4-v0.1.6) (2026-05-10)


### Features

* add useUnderline prop to GtkButton ([#31](https://github.com/gtk-js/gtk-js/issues/31)) ([5cfb75b](https://github.com/gtk-js/gtk-js/commit/5cfb75bb450e544312f032b6a3a2633ba75da081))

## 0.1.3

### Patch Changes

- 4b57fdb: Bundle packages with `bun build` before publishing. CSS text imports (`with { type: "text" }`) are now inlined as string literals, fixing compatibility with Vite and other bundlers that don't support import attributes. Package exports now point to compiled ESM with `.d.ts` declarations rather than raw TypeScript source.
- Updated dependencies [4b57fdb]
  - @gtk-js/icon-helpers@0.1.3
  - @gtk-js/icons-gtk4@0.1.3

## 0.1.2

### Patch Changes

- 69a4a98: Fix allocateShadow MutationObserver not being created when theme CSS hasn't been injected yet
  - @gtk-js/icon-helpers@0.1.2
  - @gtk-js/icons-gtk4@0.1.2

## 0.1.1

### Patch Changes

- 0982123: Bump all packages past burned npm versions
- Updated dependencies [0982123]
  - @gtk-js/icon-helpers@0.1.1
  - @gtk-js/icons-gtk4@0.1.1

## 0.2.0

### Minor Changes

- e36fdea: Provide default icon sets for providers

### Patch Changes

- c791659: fix scale drag tracking, window controls, entry-row animation, combo-row popover, scrollbar styling, text selection, preferences-page scrolling
  - @gtk-js/icon-helpers@0.2.0
  - @gtk-js/icons-gtk4@0.2.0

## 0.1.0

### Minor Changes

- f9da446: Testing CI publishing

### Patch Changes

- Updated dependencies [f9da446]
  - @gtk-js/icon-helpers@0.1.0
