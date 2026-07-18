import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { getArchivePath, isArchived, markArchived } from "./archive.js";

const tmpDir = path.join(os.tmpdir(), `podgrip-test-${process.pid}`);
const tmpArchive = path.join(tmpDir, "archive.txt");

beforeEach(() => {
  process.env.PODGRIP_ARCHIVE_PATH = tmpArchive;
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  delete process.env.PODGRIP_ARCHIVE_PATH;
  try {
    fs.unlinkSync(tmpArchive);
  } catch (_) {
    /* ok */
  }
  try {
    fs.rmdirSync(tmpDir);
  } catch (_) {
    /* ok */
  }
});

describe("getArchivePath", () => {
  it("returns PODGRIP_ARCHIVE_PATH env var when set", () => {
    expect(getArchivePath()).toBe(tmpArchive);
  });

  it("returns path under ~/.podgrip/archive.txt when env var is not set", () => {
    delete process.env.PODGRIP_ARCHIVE_PATH;
    const p = getArchivePath();
    expect(p).toContain(".podgrip");
    expect(p.endsWith("archive.txt")).toBe(true);
  });
});

describe("isArchived", () => {
  it("returns false when archive file does not exist", () => {
    expect(isArchived("fake-id")).toBe(false);
  });

  it("returns true when episode ID is in archive", () => {
    fs.writeFileSync(tmpArchive, "abc123\nxyz789\n");
    expect(isArchived("abc123")).toBe(true);
    expect(isArchived("xyz789")).toBe(true);
  });

  it("returns false when episode ID is not in archive", () => {
    fs.writeFileSync(tmpArchive, "abc123\n");
    expect(isArchived("not-there")).toBe(false);
  });
});

describe("markArchived", () => {
  it("appends episode ID to archive file", () => {
    markArchived("ep001");
    const content = fs.readFileSync(tmpArchive, "utf-8");
    expect(content).toContain("ep001");
  });
});
