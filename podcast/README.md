# podgrip

小宇宙播客下载器 — Grip your podcasts from the cosmos.

## 安装

```bash
npm install -g podgrip
```

## 使用

```bash
# 提取音频地址
podgrip extract <url>

# 查看单集详情
podgrip info <url>

# 下载单集
podgrip download <url> -o ~/Desktop -f

# 解析播客主页，列出所有剧集
podgrip parse <podcast_url>

# 交互式选择剧集下载（输出到桌面/<播客名>/）
podgrip select <podcast_url>
```

## 选项

| 参数 | 说明 |
|------|------|
| `-o, --output <dir>` | 下载目录 |
| `-n, --name <name>` | 自定义文件名 |
| `-f, --force` | 覆盖已存在文件 |
| `--no-cover` | 不嵌入封面 |

## 要求

- Node.js >= 18.17.0
- ffmpeg（可选，用于嵌入封面到 M4A）

## License

MIT
