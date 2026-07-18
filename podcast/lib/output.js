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

export function generateFilename(info, format = "m4a") {
  const prefix = info.podcastName ? `[${info.podcastName}] ` : "";
  return `${prefix}${info.title}.${format}`;
}
