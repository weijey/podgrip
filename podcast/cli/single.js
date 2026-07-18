import fs from "fs";
import path from "path";
import { extractEpisodeInfo } from "../lib/xiaoyuzhou/extract.js";
import { downloadAudio } from "../lib/download/http.js";
import { embedCover } from "../lib/download/ffmpeg.js";
import { createProgress } from "../lib/download/progress.js";
import { generateFilename } from "../lib/output.js";
import { isArchived, markArchived } from "../lib/archive.js";

export function registerSingleCommands(program) {
  program
    .command("extract <url>")
    .description("提取音频地址和封面")
    .action(async (url) => {
      const info = await extractEpisodeInfo(url);
      console.log(`\n✅ 找到音频:`);
      console.log(`   标题：${info.originalTitle}`);
      console.log(`   播客：${info.originalPodcastName || "未知"}`);
      console.log(`   地址：${info.audioUrl}`);
      if (info.coverUrl) console.log(`   封面：${info.coverUrl}`);
    });

  program
    .command("info <url>")
    .description("显示播客详细信息")
    .action(async (url) => {
      const info = await extractEpisodeInfo(url);
      console.log("\n📻 播客信息:");
      console.log(`   标题：${info.originalTitle}`);
      console.log(`   播客：${info.originalPodcastName || "未知"}`);
      console.log(`   ID: ${info.episodeId}`);
      console.log(`\n🎵 音频地址:`);
      console.log(`   ${info.audioUrl}`);
      console.log(`\n📷 封面地址:`);
      console.log(`   ${info.coverUrl || "未找到封面"}`);
    });

  program
    .command("download <url>")
    .description("下载音频并嵌入封面")
    .option("-o, --output <dir>", "下载目录", ".")
    .option("-n, --name <filename>", "自定义文件名")
    .option("-f, --force", "覆盖已存在的文件", false)
    .option("--no-cover", "不嵌入封面")
    .action(async (url, opts) => {
      const info = await extractEpisodeInfo(url);
      console.log(`\n✅ 找到音频:`);
      console.log(`   标题：${info.originalTitle}`);
      console.log(`   播客：${info.originalPodcastName || "未知"}`);

      const outputDir = path.resolve(opts.output);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`\n📁 创建目录：${outputDir}`);
      }

      const filename = opts.name
        ? opts.name.endsWith(".m4a")
          ? opts.name
          : `${opts.name}.m4a`
        : generateFilename(info);

      const outputPath = path.join(outputDir, filename);

      if (isArchived(info.episodeId) && !opts.force) {
        console.log(`\n⏭️  已归档：${info.originalTitle}`);
        console.log("   使用 -f 重新下载");
        return;
      }

      if (fs.existsSync(outputPath) && !opts.force) {
        console.log(`\n⚠️  文件已存在：${filename}`);
        console.log("   使用 -f 覆盖文件");
        return;
      }

      console.log(`\n📥 开始下载...`);
      console.log(`   文件：${filename}`);

      const progress = createProgress("进度");
      await downloadAudio(info.audioUrl, outputPath, progress);
      process.stdout.write("\n");

      const size = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
      console.log(`\n✅ 音频下载完成!`);
      console.log(`   路径：${outputPath}`);
      console.log(`   大小：${size} MB`);

      markArchived(info.episodeId);

      if (opts.cover !== false && info.coverUrl) {
        console.log("\n🎨 处理封面...");
        await embedCover(outputPath, info.coverUrl, info);
      }

      console.log("\n✅ 全部完成!");
    });
}
