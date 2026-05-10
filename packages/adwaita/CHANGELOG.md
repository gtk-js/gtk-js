# @gtk-js/adwaita

## [0.1.6](https://github.com/gtk-js/gtk-js/compare/adwaita-v0.1.5...adwaita-v0.1.6) (2026-05-10)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @gtk-js/gtk4 bumped to 0.1.6

## 0.1.3

### Patch Changes

- 4b57fdb: Bundle packages with `bun build` before publishing. CSS text imports (`with { type: "text" }`) are now inlined as string literals, fixing compatibility with Vite and other bundlers that don't support import attributes. Package exports now point to compiled ESM with `.d.ts` declarations rather than raw TypeScript source.
- Updated dependencies [4b57fdb]
  - @gtk-js/gtk4@0.1.3
  - @gtk-js/theme-adwaita@0.0.4
  - @gtk-js/icons-adwaita@0.1.3

## 0.1.2

### Patch Changes

- Updated dependencies [69a4a98]
  - @gtk-js/gtk4@0.1.2
  - @gtk-js/icons-adwaita@0.1.2
  - @gtk-js/theme-adwaita@0.0.3

## 0.1.1

### Patch Changes

- 0982123: Bump all packages past burned npm versions
- Updated dependencies [0982123]
  - @gtk-js/gtk4@0.1.1
  - @gtk-js/icons-adwaita@0.1.1
  - @gtk-js/theme-adwaita@0.0.2

## 0.2.0

### Minor Changes

- e36fdea: Provide default icon sets for providers

### Patch Changes

- c791659: fix scale drag tracking, window controls, entry-row animation, combo-row popover, scrollbar styling, text selection, preferences-page scrolling
- Updated dependencies [c791659]
- Updated dependencies [e36fdea]
  - @gtk-js/gtk4@0.2.0
  - @gtk-js/icons-adwaita@0.2.0
  - @gtk-js/theme-adwaita@0.0.2

## 0.1.0

### Minor Changes

- f9da446: Testing CI publishing

### Patch Changes

- Updated dependencies [f9da446]
  - @gtk-js/gtk4@0.1.0
