---
name: gtk-js-testing
description: Structural regression tests comparing native GTK vs web rendering. How to run tests, add new test cases, and what gets compared.
---

# Structural Regression Tests

Tests live in `tests/` and compare native GTK4/Adwaita rendering (Rust/relm4) against web React rendering (Playwright). Each test case extracts CSS properties from both sides and compares with tolerances.

## Running tests

- `vp test` — run all tests (e2e + unit)
- `vp test <filter>` — run test files matching substring (e.g. `vp test toggle`, `vp test link`)
- `vp test --project unit` — run the unit tests only (no Playwright, cargo or native server); `vp test --project unit packages/gtk-css` for the CSS transform tests
- Tests run against both Chromium and Firefox (2 tests per case)

`vp test` must always be redirected to a file:

```sh
vp test > /tmp/out.txt 2>&1
# then read /tmp/out.txt
```

Other commands (`vp run check`, `vp run fix`, `vp run build`, etc.) can be run directly.

## Adding a new test case

Three places need changes for each case. **Read the existing files to discover current patterns, available helpers, types, and naming conventions** — don't rely solely on this doc:

### 1. Native side (`tests/native/src/cases/`)

Create a Rust file with a `SimpleComponent` rendering the widget via relm4. Read existing cases in this directory for the exact pattern, then register it:
- Add `pub mod <case_name>;` in `tests/native/src/cases/mod.rs`
- In `tests/native/src/main.rs`, add to **three** places: `Command` enum variant, `case_name()` match arm, `create_widget_for_case()` match arm, **and** the `is_known_case()` `matches!()` list. Missing `is_known_case()` causes the HTTP server to return 404 for all requests to that case, making all 32 test runs fail silently with "Unknown case".

### 2. Web side (`tests/client.tsx`)

Add a case entry mapping the kebab-case name to a React element with `data-testid="target"`. Read `tests/client.tsx` for the import and case map pattern.

**NEVER add `data-testid` handling to source components in `packages/`.** All test plumbing stays in `tests/`.

For composite widgets where the component's `ref` points to an inner element (not the outer container), use a `ref` callback to set `data-testid` on the correct element:

```tsx
// GtkEntry: forwardRef<HTMLInputElement> → ref gives the inner <input>.
// parentElement is the outer .gtk-entry div, which is the correct GTK CSS node to compare.
"entry-default": () => (
  <GtkEntry
    text="Hello"
    ref={(el) => el?.parentElement?.setAttribute("data-testid", "target")}
  />
),
```

This keeps source components clean while ensuring the harness compares the right DOM node against the native widget.

### 3. Test file (`tests/cases/`)

Create `<case-name>.test.ts`. For the simplest case:

```ts
import { gtkTest } from "../harness";

gtkTest("case-name");
```

For tests needing custom assertions (e.g. relaxed tolerances), `gtkTest` accepts an optional callback with strongly typed `(native, web)` snapshots. Read `tests/harness.ts` for the `WidgetSnapshot` type and `gtkTest` signature, and `tests/assert.ts` for available assertion helpers (`gtkAssert`).

On failure, the harness always dumps full native and web JSON snapshots to stderr.

## Debugging test failures

- **Treat the root cause, not symptoms.** When a test fails, don't just relax tolerances or skip the test. Investigate what's actually wrong by cross-referencing the upstream GTK4/libadwaita C source (`upstream/gtk/`, `upstream/libadwaita/`) and SCSS.
- **Modifying source components is okay when they're wrong.** If a component in `packages/` doesn't match native GTK behavior (wrong CSS node structure, missing CSS class, incorrect default prop, bad layout manager), fix the component rather than working around it in the test.
- **Verify against native C code.** Check `gtk_widget_class_set_css_name`, `set_layout_manager_type`, `gtk_widget_add_css_class`, and default property values in the upstream source before deciding what the correct behavior should be.
- **Update tests when fixing components.** If you fix a component bug, add or update regression tests to cover the fix.
- **Validate the website visually.** After changes, check the website (`packages/website/`) using Chrome MCP, Playwright MCP, or similar browser tools if they are installed. Tests passing doesn't guarantee correct visual rendering.

## Key files to read

Before adding or modifying tests, read these to understand current state:

| File | What to look for |
|------|-----------------|
| `tests/harness.ts` | `WidgetSnapshot` type, `compare()` tolerances, `gtkTest` / `gtkTestExpectFailure` signatures |
| `tests/assert.ts` | `gtkAssert` helpers for custom test callbacks |
| `tests/client.tsx` | Case map and component imports |
| `tests/native/src/main.rs` | Command enum and match arms |
| `tests/native/src/cases/mod.rs` | Module list |
| `tests/native/src/cases/*.rs` | Existing case patterns |
| `tests/cases/*.test.ts` | Existing test patterns (simple and custom) |
| `packages/gtk-css/src/transform.test.ts` | CSS transform pipeline unit tests |

## Unit tests

Unit tests (`packages/*/src/**/*.test.ts(x)`) are the `unit` project in `vite.config.ts`, which runs without the Playwright/cargo setup. Add CSS transform regression tests in `packages/gtk-css/src/transform.test.ts`.

## Naming conventions

Read `tests/native/src/cases/mod.rs` and `tests/client.tsx` to derive the kebab-case ↔ snake_case ↔ PascalCase mapping from existing cases.
