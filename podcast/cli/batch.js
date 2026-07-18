import fs from "fs";
import path from "path";
import { parsePodcastPage } from "../lib/xiaoyuzhou/podcast.js";
import { extractEpisodeInfo } from "../lib/xiaoyuzhou/extract.js";
import { downloadAudio as dlAudio } from "../lib/download/http.js";
import { embedCover } from "../lib/download/ffmpeg.js";
import { createProgress } from "../lib/download/progress.js";
import { parallelMap } from "../lib/download/pool.js";
import { generateFilename, getDesktopPath } from "../lib/output.js";
import { selectEpisodes } from "../lib/select.js";
import { isArchived, markArchived } from "../lib/archive.js";
import { loadSubscriptions, addSubscription } from "../lib/subscriptions.js";

async function doDownload(info, outputPath, embedCoverFlag) {
  const progress = createProgress("进度");
  await dlAudio(info.audioUrl, outputPath, progress);
  process.stdout.write("\n");
  markArchived(info.episodeId);
  if (embedCoverFlag && info.coverUrl) {
    try {
      await embedCover(outputPath, info.coverUrl, info);
    } catch (e) {
      console.log(`  ⚠️ 封面失败: ${e.message}`);
    }
  }
}

async function downloadOneEpisode(ep, { outputDir, force, embedCoverFlag }) {
  const info = await extractEpisodeInfo(ep.url);

  if (isArchived(info.episodeId) && !force) {
    console.log(`${ep.title}: 📦 已归档`);
    return { status: "skipped", info, reason: "archived" };
  }

  const filename = generateFilename(info);
  const outputPath = path.join(outputDir, filename);

  if (fs.existsSync(outputPath) && !force) {
    console.log(`${ep.title}: ⏭️ 已存在`);
    return { status: "skipped", info, file: filename, reason: "exists" };
  }

  console.log(`${ep.title}: 📥 下载中...`);
  await doDownload(info, outputPath, embedCoverFlag);
  return { status: "success", info, file: filename };
}

async function downloadEps(episodes, { outputDir, force, embedCoverFlag }) {
  const mapped = await parallelMap(episodes, (ep) =>
    downloadOneEpisode(ep, { outputDir, force, embedCoverFlag }),
  );

  const results = { success: [], failed: [], skipped: [] };
  for (const r of mapped) {
    if (r.status === "failed") results.failed.push({ error: r.error });
    else if (r.value.status === "skipped") results.skipped.push(r.value);
    else results.success.push(r.value);
  }
  return results;
}

async function syncAction() {
  const subs = loadSubscriptions();
  if (subs.length === 0) {
    console.log("📭 暂无订阅。使用 podgrip subscribe <播客链接> 添加");
    return;
  }

  let totalNew = 0;
  const desktop = getDesktopPath();

  for (const sub of subs) {
    console.log(`\n📻 检查：${sub.name}`);
    const data = await parsePodcastPage(sub.url);
    const newEps = data.episodes.filter((ep) => !isArchived(ep.id));

    if (newEps.length === 0) {
      console.log("   已是最新");
      continue;
    }

    const outputDir = path.join(desktop, data.podcastName);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    console.log(`\n📋 ${newEps.length} 集新剧集，下载到 ${outputDir}\n`);
    const results = await downloadEps(newEps, {
      outputDir,
      force: false,
      embedCoverFlag: true,
    });

    totalNew += results.success.length;
  }

  console.log(`\n✅ 同步完成，共下载 ${totalNew} 集`);
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

      console.log(`\n📋 并发下载 ${selected.length} 集到 ${outputDir}\n`);
      const results = await downloadEps(selected, {
        outputDir,
        force: opts.force,
        embedCoverFlag: opts.cover !== false,
      });

      console.log("\n📊 处理统计:");
      console.log(`  成功：${results.success.length}`);
      console.log(`  失败：${results.failed.length}`);
      console.log(`  跳过：${results.skipped.length}`);
    });

  program
    .command("subscribe <podcastUrl>")
    .description("订阅播客，sync 时自动检查新集")
    .action(async (podcastUrl) => {
      const data = await parsePodcastPage(podcastUrl);
      const { subs, existed } = addSubscription(data.podcastName, podcastUrl);
      const verb = existed ? "已订阅" : "✅ 已添加订阅";
      console.log(`${verb}：${data.podcastName}`);
      console.log(`共 ${subs.length} 个订阅`);
    });

  program
    .command("subscriptions")
    .description("列出所有订阅")
    .action(() => {
      const subs = loadSubscriptions();
      if (subs.length === 0) console.log("📭 暂无订阅");
      else subs.forEach((s, i) => console.log(`  ${i + 1}. ${s.name}`));
    });

  program
    .command("sync")
    .description("检查所有订阅，下载新剧集")
    .action(async () => {
      await syncAction();
    });
}
