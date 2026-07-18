import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { loadSubscriptions, addSubscription, removeSubscription } from "./subscriptions.js";

const origPath = process.env.PODGRIP_ARCHIVE_PATH;
const tmpDir = path.join(os.tmpdir(), `podgrip-sub-test-${process.pid}`);
const tmpArchive = path.join(tmpDir, "archive.txt");

beforeEach(() => {
  process.env.PODGRIP_ARCHIVE_PATH = tmpArchive;
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  // redirect subscriptions.json to same tmp dir via env override
  const subsPath = path.join(tmpDir, "subscriptions.json");
  process.env.PODGRIP_SUBSCRIPTIONS_PATH = subsPath;
  try {
    fs.unlinkSync(subsPath);
  } catch (_) {
    /* ok */
  }
});

afterEach(() => {
  if (origPath) process.env.PODGRIP_ARCHIVE_PATH = origPath;
  else delete process.env.PODGRIP_ARCHIVE_PATH;
  delete process.env.PODGRIP_SUBSCRIPTIONS_PATH;
  try {
    fs.rmSync(tmpDir, { recursive: true });
  } catch (_) {
    /* ok */
  }
});

describe("loadSubscriptions", () => {
  it("returns empty array when no subscriptions file", () => {
    expect(loadSubscriptions()).toEqual([]);
  });
});

describe("addSubscription", () => {
  it("adds a new subscription", () => {
    const { subs, existed } = addSubscription("纵横四海", "https://example.com/p1");
    expect(existed).toBe(false);
    expect(subs).toHaveLength(1);
    expect(subs[0].name).toBe("纵横四海");
  });

  it("deduplicates by URL", () => {
    addSubscription("T1", "https://example.com/p1");
    const { subs, existed } = addSubscription("T2", "https://example.com/p1");
    expect(existed).toBe(true);
    expect(subs).toHaveLength(1);
  });

  it("persists and loads", () => {
    addSubscription("测试播客", "https://example.com/test");
    const subs = loadSubscriptions();
    expect(subs).toHaveLength(1);
    expect(subs[0].url).toBe("https://example.com/test");
  });
});

describe("removeSubscription", () => {
  it("removes by index", () => {
    addSubscription("A", "https://a");
    addSubscription("B", "https://b");
    const removed = removeSubscription(0);
    expect(removed.name).toBe("A");
    expect(loadSubscriptions()).toHaveLength(1);
  });

  it("returns null for invalid index", () => {
    expect(removeSubscription(99)).toBeNull();
  });
});
