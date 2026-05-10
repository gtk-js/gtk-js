# @gtk-js/gtk-css

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
