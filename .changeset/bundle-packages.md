---
"@gtk-js/gtk-css": patch
"@gtk-js/icon-helpers": patch
"@gtk-js/gtk4": patch
"@gtk-js/adwaita": patch
"@gtk-js/theme-adwaita": patch
"@gtk-js/theme-whitesur": patch
"@gtk-js/theme-mactahoe": patch
"@gtk-js/theme-fluent": patch
---

Bundle packages with `bun build` before publishing. CSS text imports (`with { type: "text" }`) are now inlined as string literals, fixing compatibility with Vite and other bundlers that don't support import attributes. Packages now ship compiled ESM with `.d.ts` declarations instead of raw TypeScript source.
