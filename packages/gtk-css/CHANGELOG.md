# @gtk-js/gtk-css

## [0.1.9](https://github.com/gtk-js/gtk-js/compare/gtk-css-v0.1.8...gtk-css-v0.1.9) (2026-10-31)


### Bug Fixes

* **gtk-css:** keep a :root rule's dark values where the rule is ([#162](https://github.com/gtk-js/gtk-js/issues/162)) ([8a48e41](https://github.com/gtk-js/gtk-js/commit/8a48e41587a00b865a7e9fd91e4be360dbe5df61))
* layer libadwaita's stylesheet under the mac themes, as GTK does ([#158](https://github.com/gtk-js/gtk-js/issues/158)) ([a9e0d23](https://github.com/gtk-js/gtk-js/commit/a9e0d237916d7bdc65c4c07b3f1b51d0427629c2))

## [0.1.8](https://github.com/gtk-js/gtk-js/compare/gtk-css-v0.1.7...gtk-css-v0.1.8) (2026-10-20)


### Bug Fixes

* apply libadwaita's dark-only custom properties when the scheme is forced ([#135](https://github.com/gtk-js/gtk-js/issues/135)) ([bade98f](https://github.com/gtk-js/gtk-js/commit/bade98f8c2ec2d329b2d3277248ce08c691a8528))
* derive accent-colored text from a custom accentColor in light and dark ([#136](https://github.com/gtk-js/gtk-js/issues/136)) ([2f95793](https://github.com/gtk-js/gtk-js/commit/2f95793c02dc5620d7a52f0781052b5489890149))
* draw GtkCheckButton's check marks and make radio groups exclusive ([#82](https://github.com/gtk-js/gtk-js/issues/82)) ([b8a2ce5](https://github.com/gtk-js/gtk-js/commit/b8a2ce56eea8e9adc149c8b4229d4d04fc838bfd))
* embed every theme image, drawing Fluent's scale knobs and check marks ([#148](https://github.com/gtk-js/gtk-js/issues/148)) ([f96e666](https://github.com/gtk-js/gtk-js/commit/f96e666417eaa130f5aa2899a9739c4596045cdd))
* follow the OS color scheme without fading, in every auto theme ([#142](https://github.com/gtk-js/gtk-js/issues/142)) ([dd65fa1](https://github.com/gtk-js/gtk-js/commit/dd65fa1ecb0b43291f1a97ec93899f58fe145b1b))
* give AdwViewSwitcher's buttons libadwaita's padding, icons and indicators ([#76](https://github.com/gtk-js/gtk-js/issues/76)) ([56af7fa](https://github.com/gtk-js/gtk-js/commit/56af7fa9d3e66246453bd3ca09cb3a9077bd211d))
* insensitive widgets get no hover/press feedback and dim their children ([#113](https://github.com/gtk-js/gtk-js/issues/113)) ([bd3d84f](https://github.com/gtk-js/gtk-js/commit/bd3d84f3982d440aac366d0e523df74f1b153aed))
* lay out, dim and drive GtkEntry like GTK ([#98](https://github.com/gtk-js/gtk-js/issues/98)) ([48ed5b2](https://github.com/gtk-js/gtk-js/commit/48ed5b2dd92f0f2c962fc2b73fbdda4d4be6d952))
* make AdwCarousel swipe, scroll and lay out pages like libadwaita ([#77](https://github.com/gtk-js/gtk-js/issues/77)) ([9988a2c](https://github.com/gtk-js/gtk-js/commit/9988a2c3c7dacda5c0e3f802c559fb475e9a48a3))
* make AdwDialog and AdwAlertDialog modal, adaptive and focused like libadwaita ([#93](https://github.com/gtk-js/gtk-js/issues/93)) ([6bc0bde](https://github.com/gtk-js/gtk-js/commit/6bc0bdeb25005947fe79cb2a1f12855b02df0798))
* make GtkCalendar behave and size like GTK's ([#85](https://github.com/gtk-js/gtk-js/issues/85)) ([8f9c2b6](https://github.com/gtk-js/gtk-js/commit/8f9c2b6800b25c106945002cb6013ca7a4a33256))
* mix theme colors in sRGB like GTK (.osd, .opaque, visited links) ([#114](https://github.com/gtk-js/gtk-js/issues/114)) ([8c96c6a](https://github.com/gtk-js/gtk-js/commit/8c96c6a2bfc1642ab1c574e4447586d856a01176))
* open AdwSplitButton's menu in a popover and keep both halves the same height ([#78](https://github.com/gtk-js/gtk-js/issues/78)) ([c70179a](https://github.com/gtk-js/gtk-js/commit/c70179a0b419e7e10151ca7287b9679c1a87a975))
* post-merge cleanup: shared helpers, GTK tooltips and presses, .gtk-hidden, docs themes as files ([#149](https://github.com/gtk-js/gtk-js/issues/149)) ([04457c5](https://github.com/gtk-js/gtk-js/commit/04457c5c1fbe56529c6aa9c1c6bf520853a537b3))
* resolve theme rem units against GTK's font size, not the browser's 16px ([#115](https://github.com/gtk-js/gtk-js/issues/115)) ([c9e103f](https://github.com/gtk-js/gtk-js/commit/c9e103fd84ba998ec70ec7ce1e28337a0eef2dea))
* show pressed window controls in Firefox ([#129](https://github.com/gtk-js/gtk-js/issues/129)) ([1d7cbd8](https://github.com/gtk-js/gtk-js/commit/1d7cbd889dcec9e8555eabb1ab403961551e49ca))
* size GtkSwitch from its slider like GTK, and fix dragging, disabled and delayed state ([#70](https://github.com/gtk-js/gtk-js/issues/70)) ([b69e9b0](https://github.com/gtk-js/gtk-js/commit/b69e9b0c38a1a2adf48a4e43b3b4b9dadab51ac1))
* start every GTK node at border-width 0, so spin buttons lose their 3px borders ([#111](https://github.com/gtk-js/gtk-js/issues/111)) ([ae2cd81](https://github.com/gtk-js/gtk-js/commit/ae2cd817df3cd9287b7a635810b92cd176549078))

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
