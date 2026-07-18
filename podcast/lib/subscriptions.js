import fs from "fs";
import path from "path";
import os from "os";

function getSubscriptionsPath() {
  if (process.env.PODGRIP_SUBSCRIPTIONS_PATH) return process.env.PODGRIP_SUBSCRIPTIONS_PATH;
  const dir = path.join(os.homedir(), ".podgrip");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "subscriptions.json");
}

export function loadSubscriptions() {
  const filePath = getSubscriptionsPath();
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function saveSubscriptions(subs) {
  fs.writeFileSync(getSubscriptionsPath(), JSON.stringify(subs, null, 2));
}

export function addSubscription(name, url) {
  const subs = loadSubscriptions();
  if (subs.find((s) => s.url === url)) return { subs, existed: true };
  subs.push({ name, url });
  saveSubscriptions(subs);
  return { subs, existed: false };
}

export function removeSubscription(index) {
  const subs = loadSubscriptions();
  const removed = subs.splice(index, 1);
  saveSubscriptions(subs);
  return removed.length > 0 ? removed[0] : null;
}
