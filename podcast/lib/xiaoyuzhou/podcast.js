import { createRequire } from "module";
const require = createRequire(import.meta.url);
const cheerio = require("cheerio");
const axios = require("axios");

function cleanPodcastName(rawTitle) {
  return (rawTitle || "").split("|")[0].trim();
}

function parseEpisodeList($) {
  const episodes = [];

  $('a[href*="/episode/"]').each((_, el) => {
    const href = $(el).attr("href");
    const id = href.match(/episode\/([a-zA-Z0-9]+)/)?.[1];
    if (!id || episodes.find((e) => e.id === id)) return;

    let title = $(el).find(".title").first().text().trim();
    if (!title) title = $(el).find("img").first().attr("alt") || "";
    if (!title) title = $(el).text().split(".css-")[0].trim();
    title = title.substring(0, 80);

    if (title) {
      episodes.push({
        id,
        url: href.startsWith("http") ? href : `https://www.xiaoyuzhoufm.com${href}`,
        title,
      });
    }
  });
  return episodes;
}

export async function parsePodcastPage(podcastUrl) {
  console.log(`📖 解析播客主页：${podcastUrl}`);

  const response = await axios.get(podcastUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Accept-Language": "zh-CN,zh;q=0.9",
    },
  });

  const $ = cheerio.load(response.data);
  const rawTitle = $("title").text().trim();
  const podcastName = cleanPodcastName(rawTitle) || "未知播客";
  const podcastCover = $('meta[property="og:image"]').attr("content");

  // try JSON-LD first
  let episodes = [];
  $('script[type="application/ld+json"]').each((_, elem) => {
    try {
      const data = JSON.parse($(elem).html());
      if (data.itemListElement && Array.isArray(data.itemListElement)) {
        data.itemListElement.forEach((item) => {
          if (item.url && item.url.includes("/episode/")) {
            const episodeId = item.url.match(/episode\/([a-zA-Z0-9]+)/)?.[1];
            if (episodeId && !episodes.find((e) => e.id === episodeId)) {
              episodes.push({
                id: episodeId,
                url: item.url.startsWith("http")
                  ? item.url
                  : `https://www.xiaoyuzhoufm.com${item.url}`,
                title: (item.name || "未知标题").substring(0, 80),
              });
            }
          }
        });
      }
    } catch (e) {
      /* not valid JSON-LD */
    }
  });

  if (episodes.length === 0) {
    episodes = parseEpisodeList($);
  }

  console.log(`✓ 找到 ${episodes.length} 集节目`);
  return { podcastName, podcastCover, podcastUrl, episodes };
}
