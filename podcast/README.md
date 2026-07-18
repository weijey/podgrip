# podgrip

> Grip your podcasts from the cosmos. 小宇宙 FM 播客下载器。

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.17-brightgreen)](package.json)

`podgrip` 是小宇宙 FM 专用播客下载工具——CLI + 浏览器两种交互方式。
无需登录，解析页面直取音频 CDN，流式下载，自动嵌入封面。
支持订阅管理 + 新集监控 + Web 面板。

## 特性

- **CLI + Web 双模式** — `podgrip download` 下单体，`podgrip serve` 开浏览器面板
- **订阅 + 同步** — 订阅播客，`podgrip sync` 自动抓新集。配合 cron 全自动
- **交互式选择** — `podgrip select` 列出剧集，输编号选择性下载
- **归档去重** — 纯文本 archive（yt-dlp 风格），关掉终端也知道下过什么
- **并发下载** — 3 线并发，播客多集秒下
- **封面嵌入** — ffmpeg 自动写入标题/艺术家/专辑 + 封面图
- **文件名模板** — `~/.podgrip/config.json` 自定义命名规则
- **Docker 支持** — `docker-compose up` 即跑，文件落到 Windows 桌面

## 安装

```bash
npm install -g @weijey/podgrip
```

要求 Node.js >= 18.17.0。封面嵌入需 ffmpeg：

```bash
# macOS
brew install ffmpeg
# Ubuntu/Debian
sudo apt install ffmpeg
# Docker (已内置 ffmpeg)
docker-compose up -d
```

## 5 分钟上手

```bash
# 订阅一个播客
podgrip subscribe https://www.xiaoyuzhoufm.com/podcast/62694abdb221dd5908417d1e

# 下载最近 3 集
podgrip sync --limit 3

# 交互式选择（推荐第一次用）
podgrip select https://www.xiaoyuzhoufm.com/podcast/62694abdb221dd5908417d1e

# 开 Web 面板
podgrip serve
# → 浏览器打开 http://localhost:3456
```

## 命令参考

### 单集

| 命令 | 说明 |
|------|------|
| `extract <url>` | 提取音频地址和封面 URL |
| `info <url>` | 查看单集详细信息 |
| `download <url> [options]` | 下载单集。`-f` 强制覆盖，`-o <dir>` 指定目录，`--no-cover` 跳过封面 |

### 播客

| 命令 | 说明 |
|------|------|
| `parse <url>` | 列出播客所有剧集 |
| `select <url> [options]` | 交互式选择下载。支持 `--limit`、`--offset`、`--reverse` |

### 订阅 + 同步

| 命令 | 说明 |
|------|------|
| `subscribe <url>` | 添加订阅 |
| `subscriptions` | 列出所有订阅 |
| `unsubscribe <index>` | 取消订阅 |
| `sync [options]` | 检查所有订阅，下载新集。支持 `--limit`、`--offset`、`--reverse` |

### 管理

| 命令 | 说明 |
|------|------|
| `serve [-p 3456]` | 启动 Web 管理面板 |

### 常用组合

```bash
# 免交互：订阅后自动同步
podgrip subscribe <url> && podgrip sync

# 只下最新 3 集
podgrip sync --limit 3

# 从第 10 集开始下 5 集
podgrip select <url> --offset 9 --limit 5

# 每天 9 点自动检查新集（加 crontab）
0 9 * * * podgrip sync
```

## Web 面板

```
podgrip serve

# 主页 → 所有订阅卡片
# 点卡片 → 剧集列表（已下载 / 新 / 下载中）
# 点下载 → 实时进度条
# + 添加 → 输入播客链接，订阅
```

## 配置 (`~/.podgrip/config.json`)

```json
{
  "outputDir": null,
  "concurrency": 3,
  "filenameTemplate": "[{{podcast}}] {{title}}"
}
```

| 键 | 默认 | 说明 |
|------|------|------|
| `outputDir` | `null`（自动检测桌面） | 下载目录 |
| `concurrency` | `3` | 并发下载数 |
| `filenameTemplate` | `[{{podcast}}] {{title}}` | 文件名模板。可用：`{{podcast}}`、`{{title}}`、`{{episode_id}}` |

## 数据文件 (`~/.podgrip/`)

```
~/.podgrip/
  archive.txt           # 已下载 episode ID（每行一条）
  subscriptions.json    # 订阅列表
  config.json           # 全局配置（可选）
```

归档文件是纯文本，可直接 `grep`、`wc -l`、git 追踪、跨机器同步。

## Docker

```bash
# 启动
docker-compose up -d

# 文件在 Windows 桌面，数据在 named volume
# 浏览器 → http://localhost:3456
```

## API (程序化调用)

```javascript
const podgrip = require('@weijey/podgrip')

const info = await podgrip.extractEpisodeInfo(url)
// { episodeId, title, podcastName, audioUrl, coverUrl }
```

## 原理

小宇宙 FM 是 React SPA，页面 `<script>` 中嵌入了 CDN 直链（`media.xyzcdn.net`）。
podgrip 用 cheerio 解析 HTML，免登录提取音频 URL，axios 流式下载。

订阅监控不依赖 RSS —— 定期抓取播客页面 → 对比 archive → 下载新集。

## License

[MIT](LICENSE)
