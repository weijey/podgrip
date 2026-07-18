import fs from "fs";
import path from "path";
import os from "os";

export function getDesktopPath() {
  if (process.env.WSL_DISTRO_NAME || fs.existsSync("/mnt/c/Windows")) {
    const winUser = process.env.USER || "weijey";
    const winDesktop = `/mnt/c/Users/${winUser}/Desktop`;
    if (fs.existsSync(winDesktop)) return winDesktop;
  }
  return path.join(os.homedir(), "Desktop");
}

export function generateFilename(info, template = "[{{podcast}}] {{title}}") {
  let name = template
    .replace(/\{\{podcast\}\}/g, info.podcastName || "")
    .replace(/\{\{title\}\}/g, info.title || "")
    .replace(/\{\{episode_id\}\}/g, info.episodeId || "");
  if (!name.endsWith(".m4a") && !name.endsWith(".mp3")) name += ".m4a";
  return name;
}
