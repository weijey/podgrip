import { execSync, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { downloadFile } from "./http.js";
import { id3 } from "../id3.js";

function hasFfmpeg() {
  try {
    execSync("which ffmpeg", { stdio: "ignore" });
    return true;
  } catch (e) {
    return false;
  }
}

function embedWithFfmpeg(audioPath, coverPath, metadata) {
  const tempOutput = audioPath + ".temp.m4a";

  const ffmpegArgs = [
    "-i",
    audioPath,
    "-i",
    coverPath,
    "-map",
    "0:a",
    "-map",
    "1:v",
    "-c:a",
    "copy",
    "-c:v",
    "png",
    "-disposition:v",
    "attached_pic",
    "-metadata",
    `title=${metadata.title}`,
    "-metadata",
    `artist=${metadata.artist}`,
    "-metadata",
    `album=${metadata.album}`,
    "-y",
    tempOutput,
  ];

  const result = spawnSync("ffmpeg", ffmpegArgs, { stdio: "pipe" });
  if (result.status !== 0) {
    throw new Error(result.stderr?.toString() || "ffmpeg failed");
  }

  fs.renameSync(tempOutput, audioPath);
}

function embedWithId3(audioPath, coverPath, metadata) {
  if (!audioPath.endsWith(".mp3") || !id3) {
    return false;
  }
  const coverBuffer = fs.readFileSync(coverPath);
  const tags = {
    title: metadata.title,
    artist: metadata.artist,
    album: metadata.album,
    image: {
      mime: "jpeg",
      type: 3,
      description: "Cover",
      imageBuffer: coverBuffer,
    },
  };
  id3.write(tags, audioPath);
  return true;
}

export async function embedCover(audioPath, coverUrl, info) {
  console.log("  📷 正在下载封面...");
  const tempCover = path.join(path.dirname(audioPath), "temp_cover.jpg");

  try {
    await downloadFile(coverUrl, tempCover);
    console.log("  ✓ 封面已下载");

    const metadata = {
      title: info.originalTitle || info.title,
      artist: info.originalPodcastName || info.podcastName || "Unknown",
      album: info.originalPodcastName || info.podcastName || "Unknown",
    };

    if (hasFfmpeg()) {
      console.log("  🎬 使用 ffmpeg 嵌入封面...");
      embedWithFfmpeg(audioPath, tempCover, metadata);
      console.log("  ✓ 封面已嵌入 (ffmpeg)");
    } else if (audioPath.endsWith(".mp3") && id3) {
      console.log("  ⚠️  未找到 ffmpeg，使用 node-id3 (仅 MP3)...");
      embedWithId3(audioPath, tempCover, metadata);
      console.log("  ✓ 封面已嵌入 (node-id3)");
    } else {
      console.log("  ⚠️  文件格式不支持嵌入封面（需要 ffmpeg 支持 M4A）");
      console.log("  💡 安装 ffmpeg: sudo apt install ffmpeg");
    }

    if (fs.existsSync(tempCover)) fs.unlinkSync(tempCover);
    return true;
  } catch (error) {
    console.log(`  ⚠️  封面嵌入失败：${error.message}`);
    if (fs.existsSync(tempCover)) fs.unlinkSync(tempCover);
    return false;
  }
}
