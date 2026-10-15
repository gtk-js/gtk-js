import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GtkWindow } from "./window.tsx";

describe("GtkWindow draggableRegions", () => {
  test("marks the window so its handles become app regions", () => {
    expect(renderToStaticMarkup(<GtkWindow draggableRegions />)).toContain(
      'data-draggable-regions=""',
    );
    expect(renderToStaticMarkup(<GtkWindow />)).not.toContain("data-draggable-regions");
  });
});
