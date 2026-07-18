import fs from "fs";
import path from "path";
import os from "os";

const defaults = {
  outputDir: null, // null = auto-detect desktop
  concurrency: 3,
  filenameTemplate: "[{{podcast}}] {{title}}",
};

function configPath() {
  return path.join(os.homedir(), ".podgrip", "config.json");
}

export function loadConfig() {
  const filePath = configPath();
  if (!fs.existsSync(filePath)) return { ...defaults };
  const raw = fs.readFileSync(filePath, "utf-8");
  return { ...defaults, ...JSON.parse(raw) };
}
