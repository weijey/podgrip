import readline from "readline";

export function selectEpisodes(episodes) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    console.log("\n📋 剧集列表:\n");
    episodes.forEach((e, i) => console.log(`  ${i + 1}. ${e.title}`));
    console.log("\n输入要下载的编号（逗号分隔如 1,3,5，或 all 全选）:");

    rl.question("> ", (answer) => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();

      if (trimmed === "all") {
        resolve(episodes);
        return;
      }

      const selected = [];
      const nums = trimmed
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => n >= 1 && n <= episodes.length);
      for (const n of nums) {
        if (!selected.find((e) => e.id === episodes[n - 1].id)) {
          selected.push(episodes[n - 1]);
        }
      }

      if (selected.length === 0) {
        console.log("未选择任何剧集");
        resolve([]);
      } else {
        console.log(`\n已选择 ${selected.length} 集`);
        resolve(selected);
      }
    });
  });
}
