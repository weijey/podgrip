export async function parallelMap(items, fn, concurrency = 3) {
  const results = Array.from({ length: items.length });
  const queue = items.map((item, idx) => ({ item, idx }));

  async function worker() {
    while (queue.length > 0) {
      const { item, idx } = queue.shift();
      try {
        results[idx] = { status: "success", value: await fn(item, idx) };
      } catch (err) {
        results[idx] = { status: "failed", error: err.message };
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
