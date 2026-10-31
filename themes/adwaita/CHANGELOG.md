# @gtk-js/theme-adwaita

## [0.0.10](https://github.com/gtk-js/gtk-js/compare/theme-adwaita-v0.0.9...theme-adwaita-v0.0.10) (2026-10-31)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @gtk-js/gtk-css bumped from 0.1.8 to 0.1.9

## [0.0.9](https://github.com/gtk-js/gtk-js/compare/theme-adwaita-v0.0.8...theme-adwaita-v0.0.9) (2026-10-20)


### Bug Fixes

* derive accent-colored text from a custom accentColor in light and dark ([#136](https://github.com/gtk-js/gtk-js/issues/136)) ([2f95793](https://github.com/gtk-js/gtk-js/commit/2f95793c02dc5620d7a52f0781052b5489890149))
* follow the OS color scheme without fading, in every auto theme ([#142](https://github.com/gtk-js/gtk-js/issues/142)) ([dd65fa1](https://github.com/gtk-js/gtk-js/commit/dd65fa1ecb0b43291f1a97ec93899f58fe145b1b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @gtk-js/gtk-css bumped from 0.1.7 to 0.1.8

## [0.0.8](https://github.com/gtk-js/gtk-js/compare/theme-adwaita-v0.0.7...theme-adwaita-v0.0.8) (2026-10-16)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @gtk-js/gtk-css bumped from 0.1.6 to 0.1.7

## [0.0.7](https://github.com/gtk-js/gtk-js/compare/theme-adwaita-v0.0.6...theme-adwaita-v0.0.7) (2026-10-15)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @gtk-js/gtk-css bumped to 0.1.6

## 0.0.4

### Patch Changes

- 4b57fdb: Bundle packages with `bun build` before publishing. CSS text imports (`with { type: "text" }`) are now inlined as string literals, fixing compatibility with Vite and other bundlers that don't support import attributes. Package exports now point to compiled ESM with `.d.ts` declarations rather than raw TypeScript source.
- Updated dependencies [4b57fdb]
  - @gtk-js/gtk-css@0.1.3

## 0.0.3

### Patch Changes

- @gtk-js/gtk-css@0.1.2

## 0.0.2

### Patch Changes

- 0982123: Bump all packages past burned npm versions
- Updated dependencies [0982123]
  - @gtk-js/gtk-css@0.1.1

## 0.0.1

### Patch Changes

- @gtk-js/gtk-css@0.2.0
