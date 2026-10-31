# @gtk-js/adwaita

## [0.1.12](https://github.com/gtk-js/gtk-js/compare/adwaita-v0.1.11...adwaita-v0.1.12) (2026-10-31)


### Features

* GtkProvider decorationLayout, GtkSettings' window button layout ([#159](https://github.com/gtk-js/gtk-js/issues/159)) ([3631dda](https://github.com/gtk-js/gtk-js/commit/3631ddac5c0ce60761136efc002720a340f19556))
* MacTahoeProvider and WhiteSurProvider, macOS themes as one provider ([#160](https://github.com/gtk-js/gtk-js/issues/160)) ([1bf59b9](https://github.com/gtk-js/gtk-js/commit/1bf59b9dc59771e600bcbdaec8ee58be816dc55b))


### Bug Fixes

* **adwaita:** alert dialog layout in a window and with long headings ([#163](https://github.com/gtk-js/gtk-js/issues/163)) ([5f11c08](https://github.com/gtk-js/gtk-js/commit/5f11c08beddb819f2c608561ac1e69b9598c3961))
* **adwaita:** popovers in a navigation view's page rise above the other pane ([#164](https://github.com/gtk-js/gtk-js/issues/164)) ([014f42f](https://github.com/gtk-js/gtk-js/commit/014f42f7c1182bcc367dc58364cd64c93c51e1f1))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @gtk-js/icons-adwaita bumped from 0.1.6 to 0.1.7
    * @gtk-js/gtk4 bumped from 0.1.11 to 0.1.12
    * @gtk-js/theme-adwaita bumped from 0.0.9 to 0.0.10
  * devDependencies
    * @gtk-js/gtk-css bumped from 0.1.8 to 0.1.9

## [0.1.11](https://github.com/gtk-js/gtk-js/compare/adwaita-v0.1.10...adwaita-v0.1.11) (2026-10-28)


### Performance Improvements

* lay out JS-allocated widgets in one pass per frame ([#155](https://github.com/gtk-js/gtk-js/issues/155)) ([9797722](https://github.com/gtk-js/gtk-js/commit/97977228bc24a20f2689b117ad7532fededd1fc2))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @gtk-js/gtk4 bumped from 0.1.10 to 0.1.11

## [0.1.10](https://github.com/gtk-js/gtk-js/compare/adwaita-v0.1.9...adwaita-v0.1.10) (2026-10-20)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @gtk-js/gtk4 bumped from 0.1.9 to 0.1.10

## [0.1.9](https://github.com/gtk-js/gtk-js/compare/adwaita-v0.1.8...adwaita-v0.1.9) (2026-10-20)


### Features

* GTK tooltips for tooltipText, with GTK's hover and browse timeouts ([#65](https://github.com/gtk-js/gtk-js/issues/65)) ([8cc4b88](https://github.com/gtk-js/gtk-js/commit/8cc4b88e049652e1478780580db9d2940c3d4b39))


### Bug Fixes

* **adwaita:** confirm AdwAboutDialog copies with a toast ([#66](https://github.com/gtk-js/gtk-js/issues/66)) ([5e01c7d](https://github.com/gtk-js/gtk-js/commit/5e01c7d2b4de3975c6f43f6f3c6ca5dd5e5b7f95))
* AdwComboRow shows the default cursor and behaves like GTK's combo row ([#72](https://github.com/gtk-js/gtk-js/issues/72)) ([33eacfd](https://github.com/gtk-js/gtk-js/commit/33eacfdcdc98e44af6f83a3bd6f7cc67fe91782b))
* AdwNavigationSplitView keeps its pages across collapsing and matches GTK's panes ([#118](https://github.com/gtk-js/gtk-js/issues/118)) ([5ca06d9](https://github.com/gtk-js/gtk-js/commit/5ca06d95a8b3be3ce7f473d16b161730bbfc2cd8))
* AdwOverlaySplitView shows, hides and overlays its sidebar like libadwaita ([#88](https://github.com/gtk-js/gtk-js/issues/88)) ([c3070e0](https://github.com/gtk-js/gtk-js/commit/c3070e0c5599db8f162cadaf965f0bcbd614ceba))
* AdwWindow is a GtkWindow, and AdwToolbarView's bars overlay, slide and collapse like libadwaita's ([#117](https://github.com/gtk-js/gtk-js/issues/117)) ([2a2e44b](https://github.com/gtk-js/gtk-js/commit/2a2e44b12a4965b95929b0ba748a6686bb68f3f0))
* animate AdwExpanderRow open and closed, and give it its expanded look ([#71](https://github.com/gtk-js/gtk-js/issues/71)) ([6e488aa](https://github.com/gtk-js/gtk-js/commit/6e488aa7bce99a12016ff4aceb815117d6031a0b))
* clamp, center and size AdwToastOverlay toasts like libadwaita ([#116](https://github.com/gtk-js/gtk-js/issues/116)) ([76e50d2](https://github.com/gtk-js/gtk-js/commit/76e50d235d6066da090fff9117cbe7767390a55b))
* draw AdwAboutDialog's toast over its pages, centered like libadwaita ([#150](https://github.com/gtk-js/gtk-js/issues/150)) ([d98bbb6](https://github.com/gtk-js/gtk-js/commit/d98bbb647853b03c69c133119904f43750c3c0d9))
* follow the OS color scheme without fading, in every auto theme ([#142](https://github.com/gtk-js/gtk-js/issues/142)) ([dd65fa1](https://github.com/gtk-js/gtk-js/commit/dd65fa1ecb0b43291f1a97ec93899f58fe145b1b))
* give AdwSwitchRow keyboard focus, a live GtkSwitch, disabled and AdwActionRow's props ([#69](https://github.com/gtk-js/gtk-js/issues/69)) ([0300c0e](https://github.com/gtk-js/gtk-js/commit/0300c0e1b3c2a214bba753bf8c12c85006af242a))
* give AdwViewSwitcher's buttons libadwaita's padding, icons and indicators ([#76](https://github.com/gtk-js/gtk-js/issues/76)) ([56af7fa](https://github.com/gtk-js/gtk-js/commit/56af7fa9d3e66246453bd3ca09cb3a9077bd211d))
* GtkButton/GtkToggleButton keyboard activation, labels, icons and groups like GTK ([#86](https://github.com/gtk-js/gtk-js/issues/86)) ([b52973a](https://github.com/gtk-js/gtk-js/commit/b52973ac02c62ccfb37c932960856657a229d6cf))
* GtkCenterBox/GtkActionBar children fill, align and expand; action bar slides ([#128](https://github.com/gtk-js/gtk-js/issues/128)) ([c40ff30](https://github.com/gtk-js/gtk-js/commit/c40ff30a377eed1edea34e6a8c8de9845f2333fc))
* GtkMenuButton lays out its label, icon and arrow side by side, and behaves like GTK's ([#96](https://github.com/gtk-js/gtk-js/issues/96)) ([49d648b](https://github.com/gtk-js/gtk-js/commit/49d648b05c68dedc4d4840728c0e977598bd2590))
* GtkWindow's header bar controls, title bar and resize edges behave like GTK's ([#92](https://github.com/gtk-js/gtk-js/issues/92)) ([664b131](https://github.com/gtk-js/gtk-js/commit/664b13197104ecbca2bbf8f6087fc1c77ec82e34))
* keep the header bars' 6px gap between the title and the side boxes ([#74](https://github.com/gtk-js/gtk-js/issues/74)) ([e217bcc](https://github.com/gtk-js/gtk-js/commit/e217bcc2be70d8558998bc441805b7c3ab3697ee))
* lay out AdwBanner like libadwaita, and slide it in and out ([#79](https://github.com/gtk-js/gtk-js/issues/79)) ([e7b24d4](https://github.com/gtk-js/gtk-js/commit/e7b24d4a6717dcf974ec31f751753601f528dbaf))
* make AdwActionRow, AdwButtonRow and AdwPreferencesRow behave like libadwaita's rows ([#87](https://github.com/gtk-js/gtk-js/issues/87)) ([9c6b084](https://github.com/gtk-js/gtk-js/commit/9c6b08477c222b872b99891cd3c5ae3868d8a80b))
* make AdwBreakpointBin and AdwClamp size and apply like libadwaita ([#91](https://github.com/gtk-js/gtk-js/issues/91)) ([4f0d30d](https://github.com/gtk-js/gtk-js/commit/4f0d30dc1dae46531f0bf6fcd28f0332162632db))
* make AdwCarousel swipe, scroll and lay out pages like libadwaita ([#77](https://github.com/gtk-js/gtk-js/issues/77)) ([9988a2c](https://github.com/gtk-js/gtk-js/commit/9988a2c3c7dacda5c0e3f802c559fb475e9a48a3))
* make AdwDialog and AdwAlertDialog modal, adaptive and focused like libadwaita ([#93](https://github.com/gtk-js/gtk-js/issues/93)) ([6bc0bde](https://github.com/gtk-js/gtk-js/commit/6bc0bdeb25005947fe79cb2a1f12855b02df0798))
* make AdwNavigationView's swipes, shortcuts, focus and back button menu work like libadwaita ([#89](https://github.com/gtk-js/gtk-js/issues/89)) ([39ea3bc](https://github.com/gtk-js/gtk-js/commit/39ea3bc1166e0f55781f1e25e0d8ca61a312dd26))
* make AdwToggleGroup select, lay out and take keyboard focus like libadwaita ([#90](https://github.com/gtk-js/gtk-js/issues/90)) ([3e3042b](https://github.com/gtk-js/gtk-js/commit/3e3042bc1bed6dc4d69eadde9cc66953d11183b5))
* make GtkLabel and GtkImage behave like GTK's label and image ([#109](https://github.com/gtk-js/gtk-js/issues/109)) ([7535aa7](https://github.com/gtk-js/gtk-js/commit/7535aa70affaa0a5c191452cb5b4b0d495dd3343))
* make GtkSpinButton spin, type, size and focus like GTK, and build AdwSpinRow on it ([#101](https://github.com/gtk-js/gtk-js/issues/101)) ([2bc803c](https://github.com/gtk-js/gtk-js/commit/2bc803c62ec2507af971bed84a925d798fa2ac6b))
* open AdwSplitButton's menu in a popover and keep both halves the same height ([#78](https://github.com/gtk-js/gtk-js/issues/78)) ([c70179a](https://github.com/gtk-js/gtk-js/commit/c70179a0b419e7e10151ca7287b9679c1a87a975))
* overlay scrollbars and GTK sizing for GtkScrolledWindow, working GtkScrollbar ([#97](https://github.com/gtk-js/gtk-js/issues/97)) ([c02876a](https://github.com/gtk-js/gtk-js/commit/c02876a2e98d839ce193777fc0d335e6d47acc3e))
* post-merge cleanup: shared helpers, GTK tooltips and presses, .gtk-hidden, docs themes as files ([#149](https://github.com/gtk-js/gtk-js/issues/149)) ([04457c5](https://github.com/gtk-js/gtk-js/commit/04457c5c1fbe56529c6aa9c1c6bf520853a537b3))
* preferences group/page and status page markup, header layout and row keyboard navigation ([#122](https://github.com/gtk-js/gtk-js/issues/122)) ([19b090c](https://github.com/gtk-js/gtk-js/commit/19b090c85b28c86bbe6f8deb585ff6e3c1f69ecf))
* render AdwPreferencesGroup's boxed list and rows on the server ([#134](https://github.com/gtk-js/gtk-js/issues/134)) ([2d24fba](https://github.com/gtk-js/gtk-js/commit/2d24fbac4dd8f5368d3975afe4133c1bbee50f4a))
* reveal AdwPasswordEntryRow's text with its peek button, and mask it like GTK ([#64](https://github.com/gtk-js/gtk-js/issues/64)) ([baaf567](https://github.com/gtk-js/gtk-js/commit/baaf56761ea7bff235716755125d9e3a0e457445))
* show AdwAlertDialog's body, sized to its natural height like libadwaita ([#146](https://github.com/gtk-js/gtk-js/issues/146)) ([3a148b5](https://github.com/gtk-js/gtk-js/commit/3a148b55651e20cea27b42854cb8c0794811966d))
* show off AdwAboutDialog in its docs example and match its pages to libadwaita ([#81](https://github.com/gtk-js/gtk-js/issues/81)) ([70eef9e](https://github.com/gtk-js/gtk-js/commit/70eef9ee440a6a07510bae5486c95f47ac4df8e7))
* show the I-beam over the whole AdwEntryRow, and match its states to libadwaita ([#83](https://github.com/gtk-js/gtk-js/issues/83)) ([30c9b26](https://github.com/gtk-js/gtk-js/commit/30c9b26dd925a19c41c443683c235ad019f1fb7e))
* size AdwClamp's child in CSS, so the server HTML is clamped too ([#139](https://github.com/gtk-js/gtk-js/issues/139)) ([95d5c53](https://github.com/gtk-js/gtk-js/commit/95d5c5313279d97c6884953480e33dd8ab7284d6))
* size and color AdwAvatar like libadwaita ([#120](https://github.com/gtk-js/gtk-js/issues/120)) ([db0eadd](https://github.com/gtk-js/gtk-js/commit/db0eaddfa8dd3107bb47e71ee5a0e362c2cfaceb))
* size GtkSwitch from its slider like GTK, and fix dragging, disabled and delayed state ([#70](https://github.com/gtk-js/gtk-js/issues/70)) ([b69e9b0](https://github.com/gtk-js/gtk-js/commit/b69e9b0c38a1a2adf48a4e43b3b4b9dadab51ac1))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @gtk-js/gtk4 bumped from 0.1.8 to 0.1.9
    * @gtk-js/theme-adwaita bumped from 0.0.8 to 0.0.9
  * devDependencies
    * @gtk-js/gtk-css bumped from 0.1.7 to 0.1.8

## [0.1.8](https://github.com/gtk-js/gtk-js/compare/adwaita-v0.1.7...adwaita-v0.1.8) (2026-10-16)


### Bug Fixes

* give GtkTextView its text node, so themes style and select its text ([#62](https://github.com/gtk-js/gtk-js/issues/62)) ([19ecdc8](https://github.com/gtk-js/gtk-js/commit/19ecdc8e5329b36fec3b18c579da78367ac8f8c7))
* size GtkText and AdwEntryRow's title like GTK ([#61](https://github.com/gtk-js/gtk-js/issues/61)) ([966f9fd](https://github.com/gtk-js/gtk-js/commit/966f9fdeaea85687a42389496292de39d568e5ab))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @gtk-js/gtk4 bumped from 0.1.7 to 0.1.8

## [0.1.7](https://github.com/gtk-js/gtk-js/compare/adwaita-v0.1.6...adwaita-v0.1.7) (2026-10-16)


### Bug Fixes

* center AdwAvatar like libadwaita, and let the theme style it ([#51](https://github.com/gtk-js/gtk-js/issues/51)) ([6b05514](https://github.com/gtk-js/gtk-js/commit/6b05514bc70fd04f04929a10223a9e6ac2024009))
* label the back button and window controls like GTK ([#54](https://github.com/gtk-js/gtk-js/issues/54)) ([5ea4804](https://github.com/gtk-js/gtk-js/commit/5ea48049b3ea44191bc66ea9a1020b994305d620))
* move the focus into dialogs and give it back when they close ([#55](https://github.com/gtk-js/gtk-js/issues/55)) ([7c2bb04](https://github.com/gtk-js/gtk-js/commit/7c2bb0402b9671fb520b82ae6f9894f59f2538c3))
* open AdwComboRow's choices in a GtkPopover ([#57](https://github.com/gtk-js/gtk-js/issues/57)) ([eb9fb45](https://github.com/gtk-js/gtk-js/commit/eb9fb45577fbbf4a689f5d9ac2ff8361a7d0f6bc))
* wrap word-char labels like Pango, and never wrap response labels ([#56](https://github.com/gtk-js/gtk-js/issues/56)) ([12b6676](https://github.com/gtk-js/gtk-js/commit/12b66762f4d76ac0e89c7d54368baa164aaeb56d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @gtk-js/gtk4 bumped from 0.1.6 to 0.1.7
    * @gtk-js/theme-adwaita bumped from 0.0.7 to 0.0.8
  * devDependencies
    * @gtk-js/gtk-css bumped from 0.1.6 to 0.1.7

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
