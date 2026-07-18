import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { loadConfig } from "./config.js";

const tmpDir = path.join(os.tmpdir(), `podgrip-config-test-${process.pid}`);
const tmpConfig = path.join(tmpDir, "config.json");

beforeEach(() => {
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  try {
    fs.unlinkSync(tmpConfig);
  } catch (_) {
    /* ok */
  }
});

afterEach(() => {
  try {
    fs.rmSync(tmpDir, { recursive: true });
  } catch (_) {
    /* ok */
  }
});

// loadConfig always reads from ~/.podgrip/config.json, so these test
// only the defaults when no config file exists.
describe("loadConfig", () => {
  it("returns defaults when no config file exists", () => {
    const cfg = loadConfig();
    expect(cfg.concurrency).toBe(3);
    expect(cfg.filenameTemplate).toContain("{{podcast}}");
    expect(cfg.filenameTemplate).toContain("{{title}}");
    expect(cfg.outputDir).toBeNull();
  });
});
