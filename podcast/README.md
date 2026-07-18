# podgrip

> Grip your podcasts from the cosmos. 小宇宙 FM 命令行下载器。

[![NPM Version](https://img.shields.io/npm/v/@weijey/podgrip)](https://www.npmjs.com/package/@weijey/podgrip)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.17-brightgreen)](package.json)

`podgrip` 是一个专为[小宇宙 FM](https://www.xiaoyuzhoufm.com) 设计的命令行播客下载工具。支持单集下载、播客主页解析、交互式批量选择、自动封面嵌入。零配置，一行命令即可把播客抓到本地。

## 特性

- 🎵 **单集下载** — 输入链接，拿到音频。自动从页面解析音频直链，无需登录
- 📋 **播客主页解析** — 一键列出播客所有剧集，干净标题，无 CSS 噪声
- 🎯 **交互式选择** — `podgrip select` 列出剧集，输入编号选择性下载
- 🖼️ **自动封面嵌入** — 下载完成后自动通过 ffmpeg 嵌入专辑封面到音频文件
- 📁 **智能输出路径** — WSL2 自动映射到 Windows 桌面，macOS/Linux 使用系统桌面
- 🧪 **测试覆盖** — vitest 单元测试 + oxlint 代码规范
- 🔧 **可编程调用** — 提供 `require('podgrip')` API，可嵌入其他项目

## 安装

```bash
npm install -g @weijey/podgrip
```

要求 Node.js >= 18.17.0。如需封面嵌入功能，请安装 ffmpeg：
```bash
# macOS
brew install ffmpeg
# Ubuntu/Debian
sudo apt install ffmpeg
```

## 快速开始

```bash
# 查看单集信息
podgrip info https://www.xiaoyuzhoufm.com/episode/69eb32bd1e94ae69210ebaeb

# 下载单集到桌面
podgrip download https://www.xiaoyuzhoufm.com/episode/69eb32bd1e94ae69210ebaeb -f

# 解析播客主页，看有哪些剧集
podgrip parse https://www.xiaoyuzhoufm.com/podcast/62694abdb221dd5908417d1e

# 交互式选择并下载（推荐）
podgrip select https://www.xiaoyuzhoufm.com/podcast/62694abdb221dd5908417d1e
```

## 命令参考

### `podgrip extract <url>`
提取单集的音频地址和封面 URL，不下载。

### `podgrip info <url>`
显示单集详细信息：标题、播客名、音频地址、封面地址。

### `podgrip download <url> [options]`
下载单集音频并嵌入封面。

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-o, --output <dir>` | 下载目录 | 当前目录 |
| `-n, --name <filename>` | 自定义文件名 | `[播客名] 标题.m4a` |
| `-f, --force` | 覆盖已存在文件 | `false` |
| `--no-cover` | 不嵌入封面 | — |

### `podgrip parse <podcastUrl>`
解析播客主页，列出所有剧集（只读取，不下载）。

### `podgrip select <podcastUrl> [options]`
交互式选择剧集下载。显示剧集列表 → 输入编号（如 `1,3,5` 或 `all`）→ 下载到 `桌面/<播客名>/`。

| 选项 | 说明 |
|------|------|
| `-f, --force` | 覆盖已存在文件 |
| `--no-cover` | 不嵌入封面 |

## 程序化 API

```javascript
const podgrip = require('@weijey/podgrip')

// 提取单集信息
const info = await podgrip.extractEpisodeInfo(url)
// { episodeId, title, podcastName, audioUrl, coverUrl, ... }

// 下载并嵌入封面
const result = await podgrip.download(url, {
  outputDir: './podcasts',
  embedCover: true
})
// { success: true, file: '/path/to/audio.m4a', info: {...} }
```

## 项目结构

```text
bin/cli.js              ← 入口
cli/
  single.js             ← 单集命令（extract/info/download）
  batch.js              ← 播客命令（parse/select）
lib/
  xiaoyuzhou/
    extract.js          ← 页面解析（cheerio 提取音频/标题/封面）
    podcast.js          ← 播客主页剧集列表解析
  download/
    http.js             ← HTTP 流下载
    ffmpeg.js           ← ffmpeg 封面嵌入
    progress.js         ← 下载进度回调
  output.js             ← 文件名生成 + 桌面路径
  select.js             ← 交互式剧集选择
```

## 原理

小宇宙 FM 是 React SPA，页面中的 `<script>` 标签和 JSON-LD 数据嵌入了音频 CDN 直链（`media.xyzcdn.net`）。podgrip 用 cheerio 解析这些数据，无需登录即可获取音频 URL，然后用 axios 流式下载。

## License

[MIT](LICENSE)
