# @gtk-js/adwaita

## [0.1.6](https://github.com/gtk-js/gtk-js/compare/adwaita-v0.1.5...adwaita-v0.1.6) (2026-10-15)


### Features

* add AdwAboutDialog sections, links and other apps ([#43](https://github.com/gtk-js/gtk-js/issues/43)) ([0e1e3f3](https://github.com/gtk-js/gtk-js/commit/0e1e3f3c404fbb93db149b6fab7b5b5c20600c46))
* add expand, tooltips, icon fallback and native widget layout ([#45](https://github.com/gtk-js/gtk-js/issues/45)) ([cbd75ef](https://github.com/gtk-js/gtk-js/commit/cbd75ef0d6d98bf47c9c12a7a5184b0512e91b90))
* animate navigation, dialogs and toasts like libadwaita ([#40](https://github.com/gtk-js/gtk-js/issues/40)) ([3d66efc](https://github.com/gtk-js/gtk-js/commit/3d66efc5f68bb33a1fa05066622e06231e305d3d))
* match libadwaita's preference and status pages ([#39](https://github.com/gtk-js/gtk-js/issues/39)) ([c2c3ecc](https://github.com/gtk-js/gtk-js/commit/c2c3ecc0fc2fe7177d090c883ebc5ff4c7c9b5e6))
* match upstream's AdwAboutDialog and dialog sizing ([#41](https://github.com/gtk-js/gtk-js/issues/41)) ([0630d6c](https://github.com/gtk-js/gtk-js/commit/0630d6c9a987d365460bf3d8b4044d2a11070411))


### Bug Fixes

* build the gtk4 and adwaita bundles with the production JSX runtime ([#34](https://github.com/gtk-js/gtk-js/issues/34)) ([6192460](https://github.com/gtk-js/gtk-js/commit/61924607b66666d81471c7daa12f76affa40193c))
* follow GTK CSS for border-spacing, fonts, line height, links, :disabled, specificity and transitions ([#36](https://github.com/gtk-js/gtk-js/issues/36)) ([bc00d61](https://github.com/gtk-js/gtk-js/commit/bc00d6136b666c6d5463d1f1b7f11899536e355e))
* GtkLabel ellipsizing and whitespace, AdwWindowTitle and GtkTextView width ([#37](https://github.com/gtk-js/gtk-js/issues/37)) ([9ba3dab](https://github.com/gtk-js/gtk-js/commit/9ba3dab9b12e87c5b6ee4f4c8f1095a46df2725e))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @gtk-js/icons-adwaita bumped to 0.1.6
    * @gtk-js/gtk4 bumped to 0.1.6
    * @gtk-js/theme-adwaita bumped to 0.0.7
  * devDependencies
    * @gtk-js/gtk-css bumped to 0.1.6

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
