import { describe, it, expect } from "vitest";
import { parallelMap } from "./pool.js";

describe("parallelMap", () => {
  it("maps all items and preserves order", async () => {
    const items = [1, 2, 3, 4, 5];
    const results = await parallelMap(items, async (n) => n * 2);
    expect(results.map((r) => r.value)).toEqual([2, 4, 6, 8, 10]);
    expect(results.every((r) => r.status === "success")).toBe(true);
  });

  it("handles empty array", async () => {
    const results = await parallelMap([], async () => "x");
    expect(results).toEqual([]);
  });

  it("isolates errors without affecting other items", async () => {
    const items = [1, 2, 3];
    const results = await parallelMap(items, async (n) => {
      if (n === 2) throw new Error("boom");
      return n * 10;
    });
    expect(results[0]).toEqual({ status: "success", value: 10 });
    expect(results[1]).toEqual({ status: "failed", error: "boom" });
    expect(results[2]).toEqual({ status: "success", value: 30 });
  });

  it("respects concurrency limit", async () => {
    let running = 0;
    let maxConcurrent = 0;

    const items = Array.from({ length: 10 }, (_, i) => i);
    await parallelMap(
      items,
      async () => {
        running++;
        if (running > maxConcurrent) maxConcurrent = running;
        await new Promise((r) => setTimeout(r, 5));
        running--;
      },
      3,
    );

    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });
});
