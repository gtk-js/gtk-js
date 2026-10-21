import { readFileSync } from "node:fs";
import { describe, expect, test } from "vite-plus/test";
import { parseStyleScheme } from "./parse-style-scheme.ts";
import { styleSchemes } from "./schemes.ts";
import {
  GtkSourceStyleScheme,
  GtkSourceStyleSchemeManager,
  parseSchemeColor,
} from "./style-scheme.ts";

const styles = new URL("../../../upstream/gtksourceview/data/styles/", import.meta.url).pathname;
const upstream = (file: string) => readFileSync(styles + file, "utf8");

const scheme = (xml: string) => new GtkSourceStyleScheme(parseStyleScheme(xml));

describe("parseStyleScheme", () => {
  test("every bundled upstream scheme parses, as schemes.ts has it", () => {
    for (const data of Object.values(styleSchemes)) {
      const file = data.id === "Adwaita-dark" ? "Adwaita-dark.xml" : `${data.id}.xml`;
      expect(parseStyleScheme(upstream(file))).toEqual(data);
    }
    expect(Object.keys(styleSchemes).sort()).toEqual([
      "Adwaita",
      "Adwaita-dark",
      "classic",
      "classic-dark",
      "cobalt",
      "cobalt-light",
      "kate",
      "kate-dark",
      "oblivion",
      "solarized-dark",
      "solarized-light",
      "tango",
    ]);
    expect(parseStyleScheme(upstream("testdark.xml")).parentScheme).toBe("classic");
  });

  test("reads the scheme's name, description, authors and metadata", () => {
    const adwaita = styleSchemes.Adwaita;
    expect(adwaita.name).toBe("Adwaita");
    expect(adwaita.description).toBe("An style scheme for Adwaita");
    expect(adwaita.authors).toEqual(["Christian Hergert"]);
    expect(adwaita.metadata).toEqual({ variant: "light", "dark-variant": "Adwaita-dark" });
    expect(styleSchemes.kate.name).toBe("Kate");
  });

  test("reads every style attribute", () => {
    const data = parseStyleScheme(`<?xml version="1.0"?>
      <style-scheme id="t" name="T" version="1.0">
        <color name="red" value="#ff0000"/>
        <style name="a" foreground="red" background="#00f" line-background="#rgba(1,2,3,.5)"
               bold="true" italic="yes" strikethrough="0" underline="error" underline-color="red"
               scale="large"/>
        <style name="b" underline="true" bold="true" weight="semibold"/>
        <style name="c" underline="nonsense" weight="550"/>
      </style-scheme>`);
    expect(data.styles.a).toEqual({
      foreground: "red",
      background: "#00f",
      lineBackground: "#rgba(1,2,3,.5)",
      bold: true,
      italic: true,
      strikethrough: false,
      underline: "error",
      underlineColor: "red",
      scale: "large",
    });
    // A weight replaces bold (parse_style()), and "true" underlines singly.
    expect(data.styles.b).toEqual({ underline: "single", weight: 600 });
    expect(data.styles.c).toEqual({ weight: 550 });
  });

  test("use-style copies an earlier style, its colors resolved", () => {
    const data = parseStyleScheme(`<style-scheme id="t" name="T" version="1.0">
        <color name="blue" value="#0000FF"/>
        <style name="def:type" foreground="blue" bold="true"/>
        <style name="c:type" use-style="def:type"/>
      </style-scheme>`);
    expect(data.styles["c:type"]).toEqual({ foreground: "#0000FF", bold: true });
  });

  test("rejects what GtkSourceView rejects", () => {
    const wrap = (body: string, attrs = 'id="t" name="T" version="1.0"') =>
      `<style-scheme ${attrs}>${body}</style-scheme>`;
    expect(() => parseStyleScheme(wrap('<style name="a" use-style="b"/>'))).toThrow(
      "unknown style 'b'",
    );
    expect(() =>
      parseStyleScheme(wrap('<style name="b"/><style name="a" use-style="b" bold="true"/>')),
    ).toThrow("style attributes used along with use-style");
    expect(() => parseStyleScheme(wrap('<color name="c" value="red"/>'))).toThrow("#RGB");
    expect(() =>
      parseStyleScheme(wrap('<color name="c" value="#000"/><color name="c" value="#fff"/>')),
    ).toThrow("duplicated color 'c'");
    expect(() => parseStyleScheme(wrap("<font/>"))).toThrow("unknown node 'font'");
    expect(() => parseStyleScheme(wrap("", 'id="t" name="T" version="2.0"'))).toThrow(
      "unsupported version",
    );
    expect(() => parseStyleScheme(wrap("", 'id="t" version="1.0"'))).toThrow("missing 'name'");
  });
});

describe("GtkSourceStyleScheme", () => {
  test("resolves palette colors and #-prefixed colors (get_color_by_name())", () => {
    const adwaita = new GtkSourceStyleScheme(styleSchemes.Adwaita);
    expect(adwaita.getStyle("text")).toEqual({ background: "#FFFFFF", foreground: "#504E55" });
    expect(adwaita.getStyle("current-line-number")).toEqual({
      background: "#F6F5F4",
      foreground: "#9A9996",
    });
    const cobalt = new GtkSourceStyleScheme(styleSchemes.cobalt);
    expect(cobalt.getStyle("selection")).toEqual({
      foreground: "rgba(0,0,0,0)",
      background: "rgba(0, 136, 255, .3)",
    });
    expect(adwaita.getStyle("no-such-style")).toBeNull();
  });

  test("drops colors that don't resolve", () => {
    const s = scheme(`<style-scheme id="t" name="T" version="1.0">
        <style name="a" foreground="nowhere" background="#red"/>
      </style-scheme>`);
    expect(s.getStyle("a")).toEqual({ background: "red" });
  });

  test("def:net-address falls back to def:underlined", () => {
    const s = scheme(`<style-scheme id="t" name="T" version="1.0">
        <style name="def:underlined" underline="single"/>
      </style-scheme>`);
    expect(s.getStyle("def:net-address")).toEqual({ underline: "single" });
  });

  test("parseSchemeColor reads colors like color_parse()", () => {
    expect(parseSchemeColor("#3584e4")).toBe("#3584e4");
    expect(parseSchemeColor("#add")).toBe("#add");
    expect(parseSchemeColor("#red")).toBe("red");
    expect(parseSchemeColor("#rgba(1, 2, 3, .5)")).toBe("rgba(1, 2, 3, .5)");
    expect(parseSchemeColor("#12")).toBeNull();
  });
});

describe("GtkSourceStyleSchemeManager", () => {
  const parent = parseStyleScheme(`<style-scheme id="base" name="Base" version="1.0">
      <color name="ink" value="#111111"/>
      <color name="paper" value="#eeeeee"/>
      <style name="text" foreground="ink" background="paper"/>
      <style name="def:comment" foreground="ink" italic="true"/>
    </style-scheme>`);
  const child =
    parseStyleScheme(`<style-scheme id="child" name="Child" parent-scheme="base" version="1.0">
      <color name="paper" value="#000000"/>
      <style name="text" foreground="#ffffff" background="paper"/>
      <style name="def:string" foreground="ink"/>
    </style-scheme>`);

  test("a scheme inherits its parent's styles and palette", () => {
    const manager = new GtkSourceStyleSchemeManager([child, parent]);
    const scheme = manager.getScheme("child")!;
    expect(scheme.parent?.id).toBe("base");
    // Its own style, with its own palette.
    expect(scheme.getStyle("text")).toEqual({ foreground: "#ffffff", background: "#000000" });
    // Its palette falls back to the parent's.
    expect(scheme.getStyle("def:string")).toEqual({ foreground: "#111111" });
    // The parent's style, as the parent resolves it.
    expect(scheme.getStyle("def:comment")).toEqual({ foreground: "#111111", italic: true });
  });

  test("drops schemes with a missing parent or a cycle, sorts by name", () => {
    const orphan = { ...child, id: "orphan", name: "Orphan", parentScheme: "missing" };
    const a = { ...parent, id: "a", name: "A", parentScheme: "b" };
    const b = { ...parent, id: "b", name: "B", parentScheme: "a" };
    const manager = new GtkSourceStyleSchemeManager([orphan, a, b, child, parent]);
    expect(manager.getSchemeIds()).toEqual(["base", "child"]);
    expect(manager.getScheme("orphan")).toBeNull();
  });

  test("the first scheme with an id wins", () => {
    const manager = new GtkSourceStyleSchemeManager([parent, { ...parent, name: "Other" }]);
    expect(manager.getScheme("base")?.name).toBe("Base");
  });
});
