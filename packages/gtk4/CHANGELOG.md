# @gtk-js/gtk4

## [0.1.8](https://github.com/gtk-js/gtk-js/compare/gtk4-v0.1.7...gtk4-v0.1.8) (2026-10-16)


### Bug Fixes

* give GtkTextView its text node, so themes style and select its text ([#62](https://github.com/gtk-js/gtk-js/issues/62)) ([19ecdc8](https://github.com/gtk-js/gtk-js/commit/19ecdc8e5329b36fec3b18c579da78367ac8f8c7))
* size GtkText and AdwEntryRow's title like GTK ([#61](https://github.com/gtk-js/gtk-js/issues/61)) ([966f9fd](https://github.com/gtk-js/gtk-js/commit/966f9fdeaea85687a42389496292de39d568e5ab))

## [0.1.7](https://github.com/gtk-js/gtk-js/compare/gtk4-v0.1.6...gtk4-v0.1.7) (2026-10-16)


### Bug Fixes

* give GtkScrolledWindow's child a viewport like GTK ([#52](https://github.com/gtk-js/gtk-js/issues/52)) ([0f42046](https://github.com/gtk-js/gtk-js/commit/0f4204636089b4bcde7e374ac383116a45a8d158))
* label the back button and window controls like GTK ([#54](https://github.com/gtk-js/gtk-js/issues/54)) ([5ea4804](https://github.com/gtk-js/gtk-js/commit/5ea48049b3ea44191bc66ea9a1020b994305d620))
* let GtkListBox rows take focus and move with the keyboard ([#53](https://github.com/gtk-js/gtk-js/issues/53)) ([41e6c8c](https://github.com/gtk-js/gtk-js/commit/41e6c8c638c96b2d6c76bd8978b775103a57214e))
* place GtkLabel's text by its xalign and yalign like GTK ([#58](https://github.com/gtk-js/gtk-js/issues/58)) ([e4265fe](https://github.com/gtk-js/gtk-js/commit/e4265feb16cdb9424965f454cd0a07771c344fc6))
* wrap word-char labels like Pango, and never wrap response labels ([#56](https://github.com/gtk-js/gtk-js/issues/56)) ([12b6676](https://github.com/gtk-js/gtk-js/commit/12b66762f4d76ac0e89c7d54368baa164aaeb56d))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @gtk-js/gtk-css bumped from 0.1.6 to 0.1.7

## [0.1.6](https://github.com/gtk-js/gtk-js/compare/gtk4-v0.1.5...gtk4-v0.1.6) (2026-10-15)


### Features

* add expand, tooltips, icon fallback and native widget layout ([#45](https://github.com/gtk-js/gtk-js/issues/45)) ([cbd75ef](https://github.com/gtk-js/gtk-js/commit/cbd75ef0d6d98bf47c9c12a7a5184b0512e91b90))
* add GtkPopoverMenu and anchored menu button popovers ([#38](https://github.com/gtk-js/gtk-js/issues/38)) ([3d5f6f7](https://github.com/gtk-js/gtk-js/commit/3d5f6f70ea9e007d4050d6a78e77f33a10870acd))
* add useUnderline prop to GtkButton ([#31](https://github.com/gtk-js/gtk-js/issues/31)) ([5cfb75b](https://github.com/gtk-js/gtk-js/commit/5cfb75bb450e544312f032b6a3a2633ba75da081))
* animate navigation, dialogs and toasts like libadwaita ([#40](https://github.com/gtk-js/gtk-js/issues/40)) ([3d66efc](https://github.com/gtk-js/gtk-js/commit/3d66efc5f68bb33a1fa05066622e06231e305d3d))
* match libadwaita's preference and status pages ([#39](https://github.com/gtk-js/gtk-js/issues/39)) ([c2c3ecc](https://github.com/gtk-js/gtk-js/commit/c2c3ecc0fc2fe7177d090c883ebc5ff4c7c9b5e6))
* report window shadow width and draggable regions ([#44](https://github.com/gtk-js/gtk-js/issues/44)) ([f212f5e](https://github.com/gtk-js/gtk-js/commit/f212f5e8242a0efc647427422319e097237e97ab))


### Bug Fixes

* build the gtk4 and adwaita bundles with the production JSX runtime ([#34](https://github.com/gtk-js/gtk-js/issues/34)) ([6192460](https://github.com/gtk-js/gtk-js/commit/61924607b66666d81471c7daa12f76affa40193c))
* follow GTK CSS for border-spacing, fonts, line height, links, :disabled, specificity and transitions ([#36](https://github.com/gtk-js/gtk-js/issues/36)) ([bc00d61](https://github.com/gtk-js/gtk-js/commit/bc00d6136b666c6d5463d1f1b7f11899536e355e))
* GtkLabel ellipsizing and whitespace, AdwWindowTitle and GtkTextView width ([#37](https://github.com/gtk-js/gtk-js/issues/37)) ([9ba3dab](https://github.com/gtk-js/gtk-js/commit/9ba3dab9b12e87c5b6ee4f4c8f1095a46df2725e))
* ship libadwaita's own icons, render GtkButton icon-name icons, build icons deterministically ([#35](https://github.com/gtk-js/gtk-js/issues/35)) ([36d9619](https://github.com/gtk-js/gtk-js/commit/36d96199f87e6f70e4f97436805b98ee23cdb1e9))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @gtk-js/icons-gtk4 bumped to 0.1.6
    * @gtk-js/icon-helpers bumped to 0.1.6
  * devDependencies
    * @gtk-js/gtk-css bumped to 0.1.6

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
