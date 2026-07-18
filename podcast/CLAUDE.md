# podgrip

## 项目概述

podgrip 是小宇宙 FM (xiaoyuzhoufm.com) 命令行播客下载器。
无需登录，通过 cheerio 解析页面 HTML 提取音频 CDN 直链 (media.xyzcdn.net)，
axios 流式下载，ffmpeg 自动嵌入封面。

GitHub: https://github.com/weijey/podgrip
本地路径: /home/weijey/podcast/

## 环境

- WSL2 Ubuntu 24.04, Node.js v24.15.0 (nvm), npm 11.x
- Node >= 18.17.0 要求
- ffmpeg 已安装（封面嵌入）
- 代理: Clash http://127.0.0.1:7897 (npm 需配置 proxy)
- Windows 桌面路径: /mnt/c/Users/weijey/Desktop/

## 架构

```
bin/cli.js              ← Commander 入口，版本号也在这里
cli/single.js           ← extract/info/download 子命令
cli/batch.js            ← parse/select 子命令
lib/xiaoyuzhou/extract.js   ← 单集页面解析 (cheerio)
lib/xiaoyuzhou/podcast.js   ← 播客主页剧集列表解析
lib/download/http.js        ← axios 流下载 (downloadAudio, downloadFile)
lib/download/ffmpeg.js      ← ffmpeg 封面嵌入 (embedCover)
lib/download/progress.js    ← createProgress 进度回调
lib/output.js               ← generateFilename, getDesktopPath
lib/select.js               ← selectEpisodes 交互式选择
lib/id3.js                  ← node-id3 可选依赖加载
index.js                    ← 程序化 API 入口 (CJS, 已废弃但保留)
```

## 代码规范

- ES modules ("type": "module"), 无分号, 单引号 (oxfmt 默认)
- CJS 依赖 (axios, cheerio, commander, node-id3) 通过 createRequire 导入
- 函数 ≤20 行, 参数 ≤3 个
- vitest 测试, oxlint lint, oxfmt 格式化
- commander 在 dependencies (非 devDependencies), 全局安装需要

## 关键接口

### 小宇宙 FM 网页结构
- 音频 URL 在页面 <script> 中的 media.xyzcdn.net 直链
- 播客主页是 React SPA, 剧集链接在 <a href="/episode/..."> 的 .title div 中
- api.xiaoyuzhoufm.com 所有 API 都需要 x-jike-access-token (401), 不能走 API

### 提取策略 (lib/xiaoyuzhou/extract.js)
1. <audio> 标签
2. <script> 内 media.xyzcdn.net 正则
3. 内联 JSON "audio" 字段
4. /v1/episode/ API 回退 (需要 Referer)

## 命令参考

```bash
podgrip extract <url>       # 只提取音频 URL
podgrip info <url>          # 查看单集详情
podgrip download <url> -f   # 下载单集
podgrip parse <podcast>     # 列出播客所有剧集
podgrip select <podcast>    # 交互式选择下载 (输出到 Windows 桌面)
```

## npm 发布

- 包名 podgrip (非 scoped). npm 登录用 token (npm_w4ne...etpU, bypass 2FA)
- 版本号三处同步: package.json, bin/cli.js program.version(), 手动改
- `npm install -g /home/weijey/podcast` 本地安装, `npm publish --access public` 发布
- 当前版本: 1.1.2

## Session 状态 (2026-07-18)

本次 session 完成了:
1. 调研小宇宙下载工具 → 选择 xyz-dl + 自行修复
2. 修复 download 命令 Bug (cli.js args 传递, extractor.js 参数解析)
3. 新增 select 命令 (交互式剧集选择)
4. 修复播客名/标题解析 (CSS 噪声, title split)
5. 输出路径改为 Windows 桌面 (/mnt/c/Users/weijey/Desktop/)
6. 参考 podcast-dl (563 stars) 重构架构: ES modules + commander + 拆包
7. 项目改名 podgrip, 创建 GitHub repo + release
8. npm 发布因 scoped package 权限问题暂缓 (已改回 podgrip)

## 下一步

按计划优先级: A(归档去重) → B(日期筛选) → D(并发下载) → C(RSS 监控)
详见 .claude/plans/smooth-wondering-quokka.md (最新 plan)
