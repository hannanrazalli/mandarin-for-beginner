import { describe, expect, it } from "vitest";
import { persistSettings, readSettings } from "./settings";

describe("device preferences", () => {
  it("keeps usable session preferences when storage fails", () => {
    const value = persistSettings(
      { language: "en", theme: "dark", effects: true, stored: true },
      {
        setItem() {
          throw new Error("blocked");
        },
      },
    );
    expect(value).toEqual({
      language: "en",
      theme: "dark",
      effects: true,
      stored: false,
    });
  });
  it("validates unknown stored values and survives corrupt data", () => {
    expect(readSettings({ getItem: () => "{broken" }).stored).toBe(false);
    expect(
      readSettings({
        getItem: () => '{"language":"fr","theme":"wrong","effects":"yes"}',
      }),
    ).toEqual({
      language: "ms",
      theme: "system",
      effects: false,
      stored: true,
    });
  });
  it("restores language and theme", () => {
    expect(
      readSettings({
        getItem: () => '{"language":"en","theme":"dark","effects":true}',
      }),
    ).toEqual({ language: "en", theme: "dark", effects: true, stored: true });
  });
});
