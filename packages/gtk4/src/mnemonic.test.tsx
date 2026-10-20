import { describe, expect, test } from "vite-plus/test";
import { parseMnemonic } from "./mnemonic.tsx";

describe("parseMnemonic", () => {
  test("the first underlined character is the key, lowercase", () => {
    expect(parseMnemonic("_Save File")).toEqual({
      segments: [{ mnemonic: "S" }, "ave File"],
      key: "s",
    });
  });

  test("a double underscore is a literal underscore, like strip_ulines()", () => {
    expect(parseMnemonic("Save__As")).toEqual({ segments: ["Save_As"], key: null });
    expect(parseMnemonic("A__b_c")).toEqual({ segments: ["A_b", { mnemonic: "c" }], key: "c" });
  });

  test("every marked character is underlined, the first one is the key", () => {
    expect(parseMnemonic("_a_b")).toEqual({
      segments: [{ mnemonic: "a" }, { mnemonic: "b" }],
      key: "a",
    });
  });

  test("a trailing underscore stays", () => {
    expect(parseMnemonic("Next_")).toEqual({ segments: ["Next_"], key: null });
  });
});
