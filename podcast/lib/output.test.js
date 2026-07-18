import { describe, it, expect } from "vitest";
import { generateFilename, getDesktopPath } from "./output.js";

describe("generateFilename", () => {
  it("creates filename with podcast name prefix", () => {
    const info = { podcastName: "纵横四海", title: "EP80《深度工作》" };
    expect(generateFilename(info)).toBe("[纵横四海] EP80《深度工作》.m4a");
  });

  it("uses mp3 format when specified", () => {
    const info = { podcastName: "T", title: "E1" };
    expect(generateFilename(info, "mp3")).toBe("[T] E1.mp3");
  });

  it("omits prefix when podcast name is empty", () => {
    const info = { podcastName: "", title: "Test" };
    expect(generateFilename(info)).toBe("Test.m4a");
  });
});

describe("getDesktopPath", () => {
  it("returns a string path", () => {
    const p = getDesktopPath();
    expect(typeof p).toBe("string");
    expect(p.length).toBeGreaterThan(0);
  });
});
