import { describe, it, expect } from "vitest";
import { generateFilename, getDesktopPath } from "./output.js";

describe("generateFilename", () => {
  it("uses default template [{{podcast}}] {{title}}", () => {
    const info = { podcastName: "纵横四海", title: "EP80《深度工作》" };
    expect(generateFilename(info)).toBe("[纵横四海] EP80《深度工作》.m4a");
  });

  it("applies custom template with podcast only", () => {
    const info = { podcastName: "T", title: "E1" };
    expect(generateFilename(info, "{{podcast}} - {{title}}")).toBe("T - E1.m4a");
  });

  it("applies custom template with episode_id", () => {
    const info = { podcastName: "P", title: "X", episodeId: "abc123" };
    expect(generateFilename(info, "{{title}}_{{episode_id}}")).toBe("X_abc123.m4a");
  });

  it("omits tokens when fields are empty", () => {
    const info = { podcastName: "", title: "Test" };
    expect(generateFilename(info)).toBe("[] Test.m4a");
  });

  it("does not append extension if already present in template", () => {
    const info = { podcastName: "P", title: "X.mp3" };
    expect(generateFilename(info)).toBe("[P] X.mp3");
  });
});

describe("getDesktopPath", () => {
  it("returns a string path", () => {
    const p = getDesktopPath();
    expect(typeof p).toBe("string");
    expect(p.length).toBeGreaterThan(0);
  });
});
