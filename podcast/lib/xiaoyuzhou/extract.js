import { createRequire } from "module";
const require = createRequire(import.meta.url);
const cheerio = require("cheerio");
const axios = require("axios");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function parseTitle($) {
  let title = $("h1").first().text().trim();
  if (!title) {
    title = $("title").text().replace("小宇宙", "").replace("- 播客", "").trim();
  }
  return title;
}

function parsePodcastName($) {
  let name = $(".podcast-name").text().trim();
  if (!name) {
    name = $('[class*="podcast"]').first().text().trim();
  }
  return name;
}

function parseCoverUrl($) {
  let url = $('meta[property="og:image"]').attr("content");
  if (url) return url;

  const jsonLd = $('script[type="application/ld+json"]').html();
  if (jsonLd) {
    try {
      const data = JSON.parse(jsonLd);
      if (data.image) {
        return Array.isArray(data.image) ? data.image[0] : data.image;
      }
    } catch (e) {
      /* not valid JSON */
    }
  }

  return (
    $('img[alt*="封面"], img[class*="cover"], img[class*="poster"]').first().attr("src") || null
  );
}

function parseAudioUrl($, html, _episodeId) {
  // method 1: <audio> tag
  let url = $("audio source[src]").attr("src") || $("audio[src]").attr("src");
  if (url) return url;

  // method 2: inline <script> containing media.xyzcdn.net
  const scripts = $("script");
  for (let i = 0; i < scripts.length; i++) {
    const content = $(scripts[i]).html();
    if (content && content.includes("media.xyzcdn.net")) {
      const match = content.match(/https:\/\/media\.xyzcdn\.net\/[^\s"'<>]+/);
      if (match) return match[0];
    }
  }

  // method 3: inline JSON
  const inlineMatch = html.match(/"audio"\s*:\s*"([^"]+)"/);
  if (inlineMatch && inlineMatch[1]) return inlineMatch[1];

  return null;
}

function sanitizeMeta(title, podcastName) {
  const safeTitle = (title || "").replace(/[<>:"/\\|？*]/g, "").substring(0, 100);
  const safePodcast = (podcastName || "").replace(/[<>:"/\\|？*]/g, "").substring(0, 50);
  return { safeTitle, safePodcast };
}

export async function extractEpisodeInfo(episodeUrl) {
  const episodeId = episodeUrl.match(/episode\/([a-zA-Z0-9]+)/)?.[1];
  if (!episodeId) {
    throw new Error("无效的播客链接，无法提取 episode ID");
  }

  console.log(`正在分析 episode: ${episodeId}`);

  const response = await axios.get(episodeUrl, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    },
  });

  const $ = cheerio.load(response.data);
  const title = parseTitle($);
  const podcastName = parsePodcastName($);
  const coverUrl = parseCoverUrl($);
  let audioUrl = parseAudioUrl($, response.data, episodeId);

  // method 4: API fallback
  if (!audioUrl) {
    try {
      const apiUrl = `https://www.xiaoyuzhoufm.com/v1/episode/${episodeId}`;
      const apiResp = await axios.get(apiUrl, {
        headers: { "User-Agent": UA, Referer: episodeUrl },
      });
      if (apiResp.data?.data?.audio) {
        audioUrl = apiResp.data.data.audio;
      }
    } catch (e) {
      /* optional path */
    }
  }

  if (!audioUrl) {
    throw new Error("未找到音频地址");
  }

  const { safeTitle, safePodcast } = sanitizeMeta(title, podcastName);

  return {
    episodeId,
    title: safeTitle,
    podcastName: safePodcast,
    audioUrl,
    coverUrl,
    episodeUrl,
    originalTitle: title,
    originalPodcastName: podcastName,
  };
}
