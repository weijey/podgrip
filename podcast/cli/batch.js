import fs from "fs";
import path from "path";
import { parsePodcastPage } from "../lib/xiaoyuzhou/podcast.js";
import { extractEpisodeInfo } from "../lib/xiaoyuzhou/extract.js";
import { downloadAudio as dlAudio } from "../lib/download/http.js";
import { embedCover as ec } from "../lib/download/ffmpeg.js";
import { createProgress } from "../lib/download/progress.js";
import { generateFilename, getDesktopPath } from "../lib/output.js";
import { selectEpisodes } from "../lib/select.js";
import { isArchived, markArchived } from "../lib/archive.js";

async function downloadEps(episodes, { outputDir, force, embedCoverFlag }) {
  const results = { success: [], failed: [], skipped: [] };

  for (let i = 0; i < episodes.length; i++) {
    const ep = episodes[i];
    console.log(`[${i + 1}/${episodes.length}] ${ep.title}`);

    try {
      const info = await extractEpisodeInfo(ep.url);

      if (isArchived(info.episodeId) && !force) {
        console.log(`    📦 已归档，跳过\n`);
        results.skipped.push({ ...info, reason: "archived" });
        continue;
      }

      const filename = generateFilename(info);
      const outputPath = path.join(outputDir, filename);

      if (fs.existsSync(outputPath) && !force) {
        console.log(`    ⏭️  已存在，跳过\n`);
        results.skipped.push({ ...info, file: filename, reason: "exists" });
        continue;
      }

      console.log(`    📥 下载：${filename}`);
      const progress = createProgress("进度");
      await dlAudio(info.audioUrl, outputPath, progress);
      console.log("\n    ✅ 音频完成");

      markArchived(info.episodeId);

      if (embedCoverFlag && info.coverUrl) {
        try {
          await ec(outputPath, info.coverUrl, info);
          console.log("    ✅ 封面已嵌入");
        } catch (e) {
          console.log(`    ⚠️  封面失败：${e.message}`);
        }
      }
      results.success.push({ ...info, file: filename });
    } catch (error) {
      console.log(`    ❌ 失败：${error.message}`);
      results.failed.push({ ...ep, error: error.message });
    }
    console.log("");
  }

  return results;
}

export function registerBatchCommands(program) {
  program
    .command("parse <podcastUrl>")
    .description("解析播客主页，列出所有剧集")
    .action(async (podcastUrl) => {
      const data = await parsePodcastPage(podcastUrl);
      console.log(`\n📻 播客：${data.podcastName}`);
      console.log(`📋 共 ${data.episodes.length} 集:\n`);
      data.episodes.forEach((e, i) => console.log(`  ${i + 1}. ${e.title}`));
    });

  program
    .command("select <podcastUrl>")
    .description("交互式选择剧集并下载")
    .option("-f, --force", "覆盖已存在的文件", false)
    .option("--no-cover", "不嵌入封面")
    .action(async (podcastUrl, opts) => {
      const data = await parsePodcastPage(podcastUrl);
      const selected = await selectEpisodes(data.episodes);

      if (selected.length === 0) {
        console.log("未选择任何节目，退出");
        process.exit(0);
      }

      const outputDir = path.join(getDesktopPath(), data.podcastName);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`\n📁 创建目录：${outputDir}`);
      }

      console.log(`\n📋 下载 ${selected.length} 集到 ${outputDir}\n`);
      const results = await downloadEps(selected, {
        outputDir,
        force: opts.force,
        embedCoverFlag: opts.cover !== false,
      });

      console.log("📊 处理统计:");
      console.log(`  成功：${results.success.length}`);
      console.log(`  失败：${results.failed.length}`);
      console.log(`  跳过：${results.skipped.length}`);
    });
}
