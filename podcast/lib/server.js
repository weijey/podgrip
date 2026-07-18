import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { addSubscription, loadSubscriptions } from "./subscriptions.js";
import { loadConfig } from "./config.js";
import { parsePodcastPage } from "./xiaoyuzhou/podcast.js";
import { extractEpisodeInfo } from "./xiaoyuzhou/extract.js";
import { downloadAudio } from "./download/http.js";
import { generateFilename, getDesktopPath } from "./output.js";
import { isArchived, markArchived } from "./archive.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  const staticDir = path.join(__dirname, "..", "static");

  app.use(express.json());
  app.use(express.static(staticDir));

  app.get("/api/subscriptions", (_req, res) => {
    const subs = loadSubscriptions();
    res.json(subs);
  });

  app.post("/api/subscriptions", (req, res) => {
    const { name, url } = req.body;
    if (!name || !url) return res.status(400).json({ error: "name and url required" });
    addSubscription(name, url);
    res.json({ ok: true });
  });

  app.get("/api/episodes", async (req, res) => {
    try {
      const url = req.query.url;
      if (!url) return res.status(400).json({ error: "url required" });
      const data = await parsePodcastPage(url);
      const episodes = data.episodes.map((ep) => ({
        ...ep,
        archived: isArchived(ep.id),
      }));
      res.json({ podcastName: data.podcastName, episodes });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/download/:episodeId", async (req, res) => {
    const { episodeId } = req.params;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    try {
      const url = `https://www.xiaoyuzhoufm.com/episode/${episodeId}`;
      send("status", { phase: "extract", message: "解析中..." });

      const info = await extractEpisodeInfo(url);
      const config = loadConfig();
      const filename = generateFilename(info, config.filenameTemplate);
      const outputDir = path.join(getDesktopPath(), info.podcastName);
      const outputPath = path.join(outputDir, filename);

      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      send("status", {
        phase: "download",
        message: "下载中...",
        title: info.originalTitle,
        filename,
      });

      let downloaded = 0;
      await downloadAudio(info.audioUrl, outputPath, (dl, total) => {
        downloaded = dl;
        send("progress", {
          downloaded,
          total,
          percent: Math.round((dl / total) * 100),
        });
      });

      markArchived(info.episodeId);
      send("done", {
        path: outputPath,
        title: info.originalTitle,
        size: (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1) + "MB",
      });
    } catch (e) {
      send("error", { error: e.message });
    }
  });

  return app;
}
