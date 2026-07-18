import fs from "fs";
import path from "path";
import os from "os";

function ensureArchiveDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function getArchivePath() {
  if (process.env.PODGRIP_ARCHIVE_PATH) return process.env.PODGRIP_ARCHIVE_PATH;
  const dir = path.join(os.homedir(), ".podgrip");
  ensureArchiveDir(dir);
  return path.join(dir, "archive.txt");
}

export function isArchived(episodeId) {
  const filePath = getArchivePath();
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, "utf-8");
  return content.split("\n").some((line) => line.trim() === episodeId);
}

export function markArchived(episodeId) {
  const filePath = getArchivePath();
  fs.appendFileSync(filePath, episodeId + "\n");
}
