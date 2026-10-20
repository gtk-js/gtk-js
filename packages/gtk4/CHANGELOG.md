# @gtk-js/gtk4

## [0.1.9](https://github.com/gtk-js/gtk-js/compare/gtk4-v0.1.8...gtk4-v0.1.9) (2026-10-20)


### Features

* GTK tooltips for tooltipText, with GTK's hover and browse timeouts ([#65](https://github.com/gtk-js/gtk-js/issues/65)) ([8cc4b88](https://github.com/gtk-js/gtk-js/commit/8cc4b88e049652e1478780580db9d2940c3d4b39))


### Bug Fixes

* AdwOverlaySplitView shows, hides and overlays its sidebar like libadwaita ([#88](https://github.com/gtk-js/gtk-js/issues/88)) ([c3070e0](https://github.com/gtk-js/gtk-js/commit/c3070e0c5599db8f162cadaf965f0bcbd614ceba))
* AdwWindow is a GtkWindow, and AdwToolbarView's bars overlay, slide and collapse like libadwaita's ([#117](https://github.com/gtk-js/gtk-js/issues/117)) ([2a2e44b](https://github.com/gtk-js/gtk-js/commit/2a2e44b12a4965b95929b0ba748a6686bb68f3f0))
* animate AdwExpanderRow open and closed, and give it its expanded look ([#71](https://github.com/gtk-js/gtk-js/issues/71)) ([6e488aa](https://github.com/gtk-js/gtk-js/commit/6e488aa7bce99a12016ff4aceb815117d6031a0b))
* default the monospace font to GTK's "Monospace" at the UI font size ([#123](https://github.com/gtk-js/gtk-js/issues/123)) ([f3bda65](https://github.com/gtk-js/gtk-js/commit/f3bda652ff40e3e131ca19778adaf2cd22d3e32c))
* draw GtkCheckButton's check marks and make radio groups exclusive ([#82](https://github.com/gtk-js/gtk-js/issues/82)) ([b8a2ce5](https://github.com/gtk-js/gtk-js/commit/b8a2ce56eea8e9adc149c8b4229d4d04fc838bfd))
* expand widgets whose own hexpand/vexpand is set before hydration ([#141](https://github.com/gtk-js/gtk-js/issues/141)) ([07b704c](https://github.com/gtk-js/gtk-js/commit/07b704c4024d2fe3e13c6ae1d36ab6a99ee34032))
* follow the OS color scheme without fading, in every auto theme ([#142](https://github.com/gtk-js/gtk-js/issues/142)) ([dd65fa1](https://github.com/gtk-js/gtk-js/commit/dd65fa1ecb0b43291f1a97ec93899f58fe145b1b))
* give AdwViewSwitcher's buttons libadwaita's padding, icons and indicators ([#76](https://github.com/gtk-js/gtk-js/issues/76)) ([56af7fa](https://github.com/gtk-js/gtk-js/commit/56af7fa9d3e66246453bd3ca09cb3a9077bd211d))
* GtkButton/GtkToggleButton keyboard activation, labels, icons and groups like GTK ([#86](https://github.com/gtk-js/gtk-js/issues/86)) ([b52973a](https://github.com/gtk-js/gtk-js/commit/b52973ac02c62ccfb37c932960856657a229d6cf))
* GtkCenterBox/GtkActionBar children fill, align and expand; action bar slides ([#128](https://github.com/gtk-js/gtk-js/issues/128)) ([c40ff30](https://github.com/gtk-js/gtk-js/commit/c40ff30a377eed1edea34e6a8c8de9845f2333fc))
* GtkDropDown lays out, pops up and takes keys like GTK ([#95](https://github.com/gtk-js/gtk-js/issues/95)) ([1dee04a](https://github.com/gtk-js/gtk-js/commit/1dee04a6b23b1be34dce58e96242b2b157084b12))
* GtkEditableLabel keeps its size, text and focus like GTK, and supports disabled ([#107](https://github.com/gtk-js/gtk-js/issues/107)) ([15d0c04](https://github.com/gtk-js/gtk-js/commit/15d0c045ab1c9c67b0e60f21c413ed907bcbfafa))
* GtkGrid children fill their cells, and only expanding columns grow ([#124](https://github.com/gtk-js/gtk-js/issues/124)) ([6607ca0](https://github.com/gtk-js/gtk-js/commit/6607ca00996f78b481d0e21af8c49ed627ce71b6))
* GtkLinkButton activates like a GTK button and can be insensitive ([#108](https://github.com/gtk-js/gtk-js/issues/108)) ([838e8aa](https://github.com/gtk-js/gtk-js/commit/838e8aa01466a4ca4d394f6962f81c706ced3a82))
* GtkMenuButton lays out its label, icon and arrow side by side, and behaves like GTK's ([#96](https://github.com/gtk-js/gtk-js/issues/96)) ([49d648b](https://github.com/gtk-js/gtk-js/commit/49d648b05c68dedc4d4840728c0e977598bd2590))
* GtkOverlay places its children by their halign and valign ([#75](https://github.com/gtk-js/gtk-js/issues/75)) ([2302786](https://github.com/gtk-js/gtk-js/commit/2302786b96be810b7b85ee401a39a6fc8fd90ed2))
* GtkOverlay sizes itself from its child, not its overlays ([#127](https://github.com/gtk-js/gtk-js/issues/127)) ([ed245d8](https://github.com/gtk-js/gtk-js/commit/ed245d8fc77ac952de1bad3b7615a07c1f25233a))
* GtkPaned places, clamps and drags its handle like GTK ([#105](https://github.com/gtk-js/gtk-js/issues/105)) ([76b728b](https://github.com/gtk-js/gtk-js/commit/76b728b05099e31b5679048a5e9a274a4cf11382))
* GtkProgressBar's text is a centered label named text ([#67](https://github.com/gtk-js/gtk-js/issues/67)) ([444d570](https://github.com/gtk-js/gtk-js/commit/444d570ba091425eb53987f41f634987a7a98c25))
* GtkScale layout, marks, value label and input match GtkRange/GtkScale ([#103](https://github.com/gtk-js/gtk-js/issues/103)) ([7e4c856](https://github.com/gtk-js/gtk-js/commit/7e4c8565afdf5901171fc72e979043fa7577796c))
* GtkSearchBar connects its search entry; GtkSearchEntry clear icon, text and keys match GTK ([#102](https://github.com/gtk-js/gtk-js/issues/102)) ([f083cf6](https://github.com/gtk-js/gtk-js/commit/f083cf65818a26422e17bdb8daaa52d0e8a97324))
* GtkStack keeps page state and animates; switcher tabs fill, show icons and fit the docs example ([#73](https://github.com/gtk-js/gtk-js/issues/73)) ([77e6bd9](https://github.com/gtk-js/gtk-js/commit/77e6bd91c964c8d7028227eab5dabda1c2838377))
* GtkToggleButton shows its icon ([#68](https://github.com/gtk-js/gtk-js/issues/68)) ([342c126](https://github.com/gtk-js/gtk-js/commit/342c126cc9a9453b054001a884d7ff8475702c7a))
* GtkWindow's header bar controls, title bar and resize edges behave like GTK's ([#92](https://github.com/gtk-js/gtk-js/issues/92)) ([664b131](https://github.com/gtk-js/gtk-js/commit/664b13197104ecbca2bbf8f6087fc1c77ec82e34))
* hide GtkProvider content until its theme CSS and expand are in place ([#130](https://github.com/gtk-js/gtk-js/issues/130)) ([bc8e654](https://github.com/gtk-js/gtk-js/commit/bc8e654d21145f05d6e97da65e590afb11143aa6))
* keep the header bars' 6px gap between the title and the side boxes ([#74](https://github.com/gtk-js/gtk-js/issues/74)) ([e217bcc](https://github.com/gtk-js/gtk-js/commit/e217bcc2be70d8558998bc441805b7c3ab3697ee))
* lay out AdwBanner like libadwaita, and slide it in and out ([#79](https://github.com/gtk-js/gtk-js/issues/79)) ([e7b24d4](https://github.com/gtk-js/gtk-js/commit/e7b24d4a6717dcf974ec31f751753601f528dbaf))
* lay out GtkExpander's title like GTK and focus, toggle and disable it like GTK ([#106](https://github.com/gtk-js/gtk-js/issues/106)) ([e64c093](https://github.com/gtk-js/gtk-js/commit/e64c09318641f506be0a5a769d1c5c3221da97c9))
* lay out GtkFrame's label and child like gtk_frame_size_allocate() ([#125](https://github.com/gtk-js/gtk-js/issues/125)) ([cf9f2f0](https://github.com/gtk-js/gtk-js/commit/cf9f2f03b0fdce516127df21cc1a5552c2501a18))
* lay out GtkLevelBar and GtkProgressBar like GTK, fix inverted, pulse and text ([#104](https://github.com/gtk-js/gtk-js/issues/104)) ([b504b8d](https://github.com/gtk-js/gtk-js/commit/b504b8d870f072ed72a381bb7d3eb7c7de64d518))
* lay out GtkNotebook like GTK and give it GTK's focus, keys and scroll arrows ([#94](https://github.com/gtk-js/gtk-js/issues/94)) ([e75b8ae](https://github.com/gtk-js/gtk-js/commit/e75b8ae97ca0cfe547d5ad17394e2fdf4bb37760))
* lay out, dim and drive GtkEntry like GTK ([#98](https://github.com/gtk-js/gtk-js/issues/98)) ([48ed5b2](https://github.com/gtk-js/gtk-js/commit/48ed5b2dd92f0f2c962fc2b73fbdda4d4be6d952))
* make AdwActionRow, AdwButtonRow and AdwPreferencesRow behave like libadwaita's rows ([#87](https://github.com/gtk-js/gtk-js/issues/87)) ([9c6b084](https://github.com/gtk-js/gtk-js/commit/9c6b08477c222b872b99891cd3c5ae3868d8a80b))
* make AdwBreakpointBin and AdwClamp size and apply like libadwaita ([#91](https://github.com/gtk-js/gtk-js/issues/91)) ([4f0d30d](https://github.com/gtk-js/gtk-js/commit/4f0d30dc1dae46531f0bf6fcd28f0332162632db))
* make AdwCarousel swipe, scroll and lay out pages like libadwaita ([#77](https://github.com/gtk-js/gtk-js/issues/77)) ([9988a2c](https://github.com/gtk-js/gtk-js/commit/9988a2c3c7dacda5c0e3f802c559fb475e9a48a3))
* make AdwDialog and AdwAlertDialog modal, adaptive and focused like libadwaita ([#93](https://github.com/gtk-js/gtk-js/issues/93)) ([6bc0bde](https://github.com/gtk-js/gtk-js/commit/6bc0bdeb25005947fe79cb2a1f12855b02df0798))
* make AdwToggleGroup select, lay out and take keyboard focus like libadwaita ([#90](https://github.com/gtk-js/gtk-js/issues/90)) ([3e3042b](https://github.com/gtk-js/gtk-js/commit/3e3042bc1bed6dc4d69eadde9cc66953d11183b5))
* make GtkCalendar behave and size like GTK's ([#85](https://github.com/gtk-js/gtk-js/issues/85)) ([8f9c2b6](https://github.com/gtk-js/gtk-js/commit/8f9c2b6800b25c106945002cb6013ca7a4a33256))
* make GtkFlowBox select, navigate and reflow like GTK ([#84](https://github.com/gtk-js/gtk-js/issues/84)) ([3a6d40b](https://github.com/gtk-js/gtk-js/commit/3a6d40bd78570647a9c5e6f22b88e39b003e14ab))
* make GtkLabel and GtkImage behave like GTK's label and image ([#109](https://github.com/gtk-js/gtk-js/issues/109)) ([7535aa7](https://github.com/gtk-js/gtk-js/commit/7535aa70affaa0a5c191452cb5b4b0d495dd3343))
* make GtkPasswordEntry's peek, caps-lock indicator, sizing and disabled state match GTK ([#100](https://github.com/gtk-js/gtk-js/issues/100)) ([83e2d8e](https://github.com/gtk-js/gtk-js/commit/83e2d8ea298027c0bb04e5c648532184bcd0cb60))
* make GtkPopover modal and fitted like GTK's, and menus keyboard-complete ([#99](https://github.com/gtk-js/gtk-js/issues/99)) ([4259186](https://github.com/gtk-js/gtk-js/commit/425918692eb326a87b4c1360f0585ec379bdde3b))
* make GtkSpinButton spin, type, size and focus like GTK, and build AdwSpinRow on it ([#101](https://github.com/gtk-js/gtk-js/issues/101)) ([2bc803c](https://github.com/gtk-js/gtk-js/commit/2bc803c62ec2507af971bed84a925d798fa2ac6b))
* open AdwSplitButton's menu in a popover and keep both halves the same height ([#78](https://github.com/gtk-js/gtk-js/issues/78)) ([c70179a](https://github.com/gtk-js/gtk-js/commit/c70179a0b419e7e10151ca7287b9679c1a87a975))
* overlay scrollbars and GTK sizing for GtkScrolledWindow, working GtkScrollbar ([#97](https://github.com/gtk-js/gtk-js/issues/97)) ([c02876a](https://github.com/gtk-js/gtk-js/commit/c02876a2e98d839ce193777fc0d335e6d47acc3e))
* paint a scale's slider over its highlight ([#147](https://github.com/gtk-js/gtk-js/issues/147)) ([8d63e17](https://github.com/gtk-js/gtk-js/commit/8d63e177239a7c88e1aa2bdd4f0a6acd2342a550))
* place GtkScale's slider in CSS, so the server HTML has it right ([#140](https://github.com/gtk-js/gtk-js/issues/140)) ([692aabd](https://github.com/gtk-js/gtk-js/commit/692aabd65f48faba5f9b96a8db7c681f0fe4db4e))
* post-merge cleanup: shared helpers, GTK tooltips and presses, .gtk-hidden, docs themes as files ([#149](https://github.com/gtk-js/gtk-js/issues/149)) ([04457c5](https://github.com/gtk-js/gtk-js/commit/04457c5c1fbe56529c6aa9c1c6bf520853a537b3))
* render AdwPreferencesGroup's boxed list and rows on the server ([#134](https://github.com/gtk-js/gtk-js/issues/134)) ([2d24fba](https://github.com/gtk-js/gtk-js/commit/2d24fbac4dd8f5368d3975afe4133c1bbee50f4a))
* render GtkProvider's CSS into server HTML so content is styled at first paint ([#131](https://github.com/gtk-js/gtk-js/issues/131)) ([af2460c](https://github.com/gtk-js/gtk-js/commit/af2460cae316d3af86be61b0fb7670d54b4b2a7a))
* reveal AdwPasswordEntryRow's text with its peek button, and mask it like GTK ([#64](https://github.com/gtk-js/gtk-js/issues/64)) ([baaf567](https://github.com/gtk-js/gtk-js/commit/baaf56761ea7bff235716755125d9e3a0e457445))
* select, activate and focus GtkListBox rows like GTK ([#80](https://github.com/gtk-js/gtk-js/issues/80)) ([5c20ae2](https://github.com/gtk-js/gtk-js/commit/5c20ae2628f90f9c9ae6f92c004b5b8c81a944ff))
* show off AdwAboutDialog in its docs example and match its pages to libadwaita ([#81](https://github.com/gtk-js/gtk-js/issues/81)) ([70eef9e](https://github.com/gtk-js/gtk-js/commit/70eef9ee440a6a07510bae5486c95f47ac4df8e7))
* show pressed window controls in Firefox ([#129](https://github.com/gtk-js/gtk-js/issues/129)) ([1d7cbd8](https://github.com/gtk-js/gtk-js/commit/1d7cbd889dcec9e8555eabb1ab403961551e49ca))
* show the default arrow cursor over gtk-js widgets, as GTK does ([#112](https://github.com/gtk-js/gtk-js/issues/112)) ([64b3f92](https://github.com/gtk-js/gtk-js/commit/64b3f92d29c1633bfd678d2ab6bb9c747c556d4b))
* size AdwClamp's child in CSS, so the server HTML is clamped too ([#139](https://github.com/gtk-js/gtk-js/issues/139)) ([95d5c53](https://github.com/gtk-js/gtk-js/commit/95d5c5313279d97c6884953480e33dd8ab7284d6))
* size GtkLabel in whole pixels, like GTK ([#119](https://github.com/gtk-js/gtk-js/issues/119)) ([7b31a98](https://github.com/gtk-js/gtk-js/commit/7b31a987d51a8c1300437169294ecec9918f9176))
* size GtkSwitch from its slider like GTK, and fix dragging, disabled and delayed state ([#70](https://github.com/gtk-js/gtk-js/issues/70)) ([b69e9b0](https://github.com/gtk-js/gtk-js/commit/b69e9b0c38a1a2adf48a4e43b3b4b9dadab51ac1))
* size homogeneous GtkBox slots by the largest child and honor child alignment ([#126](https://github.com/gtk-js/gtk-js/issues/126)) ([94b367f](https://github.com/gtk-js/gtk-js/commit/94b367f0034e83b870dfa6570155d5e84e5cf6cd))
* size, scroll and edit GtkTextView like GTK ([#110](https://github.com/gtk-js/gtk-js/issues/110)) ([b340040](https://github.com/gtk-js/gtk-js/commit/b3400408a64f670cb2e7daed6539f40eb41f2e9f))
* start every GTK node at border-width 0, so spin buttons lose their 3px borders ([#111](https://github.com/gtk-js/gtk-js/issues/111)) ([ae2cd81](https://github.com/gtk-js/gtk-js/commit/ae2cd817df3cd9287b7a635810b92cd176549078))
* switch GtkProvider themes without fading between them ([#132](https://github.com/gtk-js/gtk-js/issues/132)) ([9a4d492](https://github.com/gtk-js/gtk-js/commit/9a4d492a8f631e949106fa65e081656b606a4b2b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @gtk-js/gtk-css bumped from 0.1.7 to 0.1.8

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
