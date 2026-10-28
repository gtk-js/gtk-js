# gtk-js

Bringing the GTK4/Adwaita ecosystem to the web via React.

## Tooling

gtk-js uses [Vite+](https://viteplus.dev) (`vp`) on npm workspaces.

- `packages/` holds the published libraries (`gtk4`, `adwaita`, `gtk-css`, `icon-helpers`), `themes/` and `icons/` the published themes and icon sets, and `apps/website` the docs site, which isn't published. Docs pages point at component sources from the site's directory (`path="../../packages/adwaita/src/components/avatar.tsx"`).
- `vp install` installs dependencies. `vp run <script>` runs a root script; `vp run -r <script>` runs it in every package.
- `vp run` orders packages only by `workspace:` dependencies, which npm can't install, so it can't see the npm workspace graph. Each package's `build` is therefore a task in its `vite.config.ts` (`buildTask` from `vite.shared.ts`), not a `package.json` script, and runs after the builds of the `@gtk-js/*` packages it depends on.
- `vp run build:packages` builds the published packages: `node build.ts` generates CSS or icons where a package has one, then `vp pack` (tsdown) bundles `src/index.ts` and its types into `dist/`.
- `vp test` runs the tests (Vitest). See the `gtk-js-testing` skill.
- Run `vp run check` (biome lint + tsc) and `vp run fix` (biome auto-fix) before committing.
- Scripts (`build.ts`, `scripts/*.ts`) run on Node directly, which strips their types, so relative imports need explicit `.ts` extensions and TypeScript-only runtime syntax (enums, namespaces) can't be used.
- CSS a component injects as text is imported with `?raw` (`import resetCSS from "./reset.css?raw"`). Vite inlines it in the dev server and tests, and `vp pack` in `dist/`.

## Architecture: Two Rendering Layers

GTK has two completely separate rendering layers:

1. **Theme CSS** (Adwaita SCSS) — handles ONLY visual appearance: colors, borders, shadows, padding, fonts, transitions. Does NOT handle layout.
2. **Layout Managers** (C code) — handles structural layout: flex, grid, centering, spacing. Replicated on the web via `layout.css` and layout components.

When adding a new widget, always check which layout manager it uses in the upstream C source (`set_layout_manager_type`), then use the corresponding layout CSS class.

## Cross-Referencing Against Upstream

**ALWAYS cross-verify against the actual GTK4 and libadwaita source code** in `upstream/gtk/` and `upstream/libadwaita/` (git submodules). This applies to ANY modification — styling, functionality, props, behavior, layout, or CSS/SCSS — not just when first implementing a widget. Any time a component or stylesheet is changed, check the relevant upstream source first.

When implementing OR modifying a widget, component, or stylesheet:

1. **Check the C source** for:
   - CSS node name (`gtk_widget_class_set_css_name`)
   - Layout manager (`set_layout_manager_type`)
   - Dynamic CSS classes (`gtk_widget_add_css_class` / `remove_css_class`)
   - Default property values (e.g. GtkLabel's `yalign = 0.5`)
   - Internal child structure

2. **Check the SCSS source** at `upstream/libadwaita/src/stylesheet/widgets/` for:
   - Exact CSS values (min-height, padding, font-weight)
   - Hover/active/focus state changes
   - Whether properties are `background-color` vs `background-image` (matters for animations)
   - Placeholder selectors (`%opaque_button`, `%button_basic_flat`) that get `@extend`ed

3. **Build a native GTK4 reference app** with the same layout to visually compare side-by-side.

## CSS Transform Pipeline

`@gtk-js/gtk-css` converts GTK CSS to web CSS:

1. **sassc compilation** — must use `sassc`, not dart-sass (libadwaita has a syntax bug dart-sass rejects)
2. **Text preprocessing** — strips `@define-color`, resolves `@color_name` references with light/dark separation
3. **PostCSS plugins** — remap selectors, pseudo-classes, `-gtk-*` properties, `image()` function

### Key pipeline rules

- `@define-color` light vs dark values must be separated — dark values live inside `@media (prefers-color-scheme: dark)` blocks. The preprocessor tracks brace depth.
- `@accent_bg_color` and `@accent_fg_color` are set at runtime in native GTK, never in the stylesheet. We seed with GNOME default blue (#3584e4).
- `image()` replacement needs balanced-paren matching for nested `color-mix()`.
- Convert `background-image: image(X)` to a `linear-gradient` (NOT `background-color`) — this preserves layering so hover overlays (background-image) render on top of base background-color correctly. A single-color overlay is drawn as two layers that transition with `background`, because browsers can't interpolate images and GTK cross-fades them: the registered `--gtk-background-overlay` color, and currentColor at the registered `--gtk-background-tint` percentage for `alpha(currentColor, …)` overlays (a registered color can't fade to a mix of currentColor; a percentage can, and keeps the widget's actual color).
- The selector map in `selectors.ts` must cover ALL bare GTK selectors. Audit after any upstream update.
- GTK node names keep a type selector's specificity: `row` becomes `:where(.gtk-row):not(_)`, not `.gtk-row`. As plain classes, rules like `list.boxed-list > row` and `row.entry.focused` would tie and the later one would win. gtk-js's own `layout.css` is weighed the same way when injected.
- `--gtk-current-color` mirrors every `color` declaration. Widgets whose own color changes with a state (`switch:checked`, `button:drop(active)`; only GTK's state pseudo-classes count, not `:not()`) read currentColor through it, overlays included: GTK resolves currentcolor before transitioning, browsers resolve it against the element's new color. Everything else keeps plain `currentColor`, so it follows colors set by app CSS. Plain app CSS that recolors one of those widgets has to set `--gtk-current-color` too (CSS run through `gtkToWeb` does).

## Box Model

GTK uses `content-box` sizing — `min-height` refers to content only, padding is added on top. The reset CSS uses `box-sizing: content-box` to match. Do NOT change to `border-box`.

## Icon System

- `@gtk-js/icon-helpers` — shared `createGtkIcon` factory and SVG parsing/build helpers
- `@gtk-js/gtk4-icons` — GTK4 base icons from `upstream/gtk/gtk/icons/`
- `@gtk-js/adwaita-icons` — Adwaita theme icons from `upstream/adwaita-icon-theme/`
- Icons are React components generated at build time from upstream SVGs
- Both icon packages export the same component names — the Provider's `icons` prop selects which set
- `AdwaitaProvider`, `MacTahoeProvider` and `WhiteSurProvider` (in the theme packages) each give a theme with its icon set; the `icons` an app passes go over the set's. The mac ones also set macOS's window button order through GtkProvider's `decorationLayout` (GtkSettings:gtk-decoration-layout), which header bars and dialogs (only close, on its side, like AdwSheetControls) follow
- Widgets load icons from context, never by importing an icon package directly
- The website (`apps/website/`) should prefer Adwaita icons (`@gtk-js/adwaita-icons`) over GTK4 icons

## Component Conventions

- Prefix with `Gtk` (GtkButton, GtkBox, GtkLabel). CamelCase props (hasFrame, iconName).
- Each component mirrors the GTK widget's CSS node tree so Adwaita CSS selectors match.
- Layout via CSS classes (`gtk-box-layout`, `gtk-center-layout`, `gtk-bin-layout`), not inline styles. Exception: `gap` for spacing.
- `.gtk-window.csd` needs `overflow: clip` — GTK clips to border-radius automatically, browsers don't.
- GtkLabel needs `display: inline-flex; align-items: center` to match GTK's default `yalign=0.5`.
- GtkImage needs `display: inline-flex` to form a proper box for circular `border-radius`.

## Debugging & Fixing Principles

- **Treat the root cause, not symptoms.** When a widget renders incorrectly, don't patch around it — find what's actually wrong. Cross-reference the upstream C source and SCSS to understand the intended behavior, then fix the underlying issue.
- **Modifying source components is okay when they're wrong.** If a component in `packages/` doesn't match native GTK behavior (wrong CSS node structure, missing CSS class, incorrect default prop, bad layout manager), fix the component. Don't work around broken components in tests or the website.
- **Validate the website visually.** After changes that affect rendering, check the website (`apps/website/`) using Chrome MCP, Playwright MCP, or similar browser tools — but only if they are installed. Don't skip visual verification just because tests pass.

## Testing

Use the `gtk-js-testing` skill for all testing details: running tests, adding test cases, debugging failures, and test conventions.

## Updating Upstream

```sh
vp run update-upstream
```

Queries latest stable tags (even minor versions per GNOME convention) and checks them out in each submodule.
