import { describe, it, expect, vi } from "vitest";
import { createProgress } from "./progress.js";

describe("createProgress", () => {
  it("calls stdout.write on progress change", () => {
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const cb = createProgress("进度");
    cb(1024 * 1024 * 10, 1024 * 1024 * 100); // 10%
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("skips output when under 10% increment", () => {
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const cb = createProgress("进度");
    cb(1024 * 1024 * 5, 1024 * 1024 * 100); // 5% — triggers (first call)
    spy.mockReset();
    cb(1024 * 1024 * 6, 1024 * 1024 * 100); // 6% — skip
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("fires on 100% regardless of increment", () => {
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const cb = createProgress("进度");
    cb(1024 * 1024 * 95, 1024 * 1024 * 100);
    spy.mockReset();
    cb(1024 * 1024 * 100, 1024 * 1024 * 100);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
