import { createRequire } from "module";
const require = createRequire(import.meta.url);
const axios = require("axios");
import fs from "fs";

export async function downloadFile(url, outputPath) {
  const response = await axios({
    method: "GET",
    url,
    responseType: "stream",
    timeout: 120000,
    maxRedirects: 5,
  });

  const writer = fs.createWriteStream(outputPath);

  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
    response.data.on("error", reject);
  });
}

export async function downloadAudio(audioUrl, outputPath, progressCallback) {
  const response = await axios({
    method: "GET",
    url: audioUrl,
    responseType: "stream",
    timeout: 120000,
    maxRedirects: 5,
  });

  const writer = fs.createWriteStream(outputPath);

  return new Promise((resolve, reject) => {
    let downloaded = 0;
    const total = parseInt(response.headers["content-length"] || "0", 10);

    response.data.on("data", (chunk) => {
      downloaded += chunk.length;
      if (progressCallback && total > 0) {
        progressCallback(downloaded, total);
      }
    });

    response.data.pipe(writer);

    writer.on("finish", resolve);
    writer.on("error", reject);
    response.data.on("error", reject);
  });
}
