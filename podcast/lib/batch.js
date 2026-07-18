#!/usr/bin/env node

const axios = require('axios')
const cheerio = require('cheerio')
const { extractEpisodeInfo, downloadAudio, downloadFile, generateFilename, embedCover } = require('./extractor.js')
const fs = require('fs')
const path = require('path')
function getDesktopPath() {
  // WSL2: map to Windows Desktop
  if (process.env.WSL_DISTRO_NAME || fs.existsSync('/mnt/c/Windows')) {
    const winUser = process.env.USER || 'weijey'
    const winDesktop = `/mnt/c/Users/${winUser}/Desktop`
    if (fs.existsSync(winDesktop)) return winDesktop
  }
  return path.join(os.homedir(), 'Desktop')
}

function cleanPodcastName(rawTitle) {
  return (rawTitle || '').split('|')[0].trim()
}

function parseEpisodeList($) {
  const episodes = []

  $('a[href*="/episode/"]').each((_, el) => {
    const href = $(el).attr('href')
    const id = href.match(/episode\/([a-zA-Z0-9]+)/)?.[1]
    if (!id || episodes.find(e => e.id === id)) return

    let title = $(el).find('.title').first().text().trim()
    if (!title) title = $(el).find('img').first().attr('alt') || ''
    if (!title) title = $(el).text().split('.css-')[0].trim()
    title = title.substring(0, 80)

    if (title) {
      episodes.push({
        id,
        url: href.startsWith('http') ? href : `https://www.xiaoyuzhoufm.com${href}`,
        title
      })
    }
  })
  return episodes
}

async function parsePodcastPage(podcastUrl) {
  console.log(`📖 解析播客主页：${podcastUrl}`)

  const response = await axios.get(podcastUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept-Language': 'zh-CN,zh;q=0.9'
    }
  })

  const $ = cheerio.load(response.data)
  const rawTitle = $('title').text().trim()
  const podcastName = cleanPodcastName(rawTitle) || '未知播客'
  const podcastCover = $('meta[property="og:image"]').attr('content')

  // try JSON-LD first
  let episodes = []
  $('script[type="application/ld+json"]').each((_, elem) => {
    try {
      const data = JSON.parse($(elem).html())
      if (data.itemListElement && Array.isArray(data.itemListElement)) {
        data.itemListElement.forEach(item => {
          if (item.url && item.url.includes('/episode/')) {
            const episodeId = item.url.match(/episode\/([a-zA-Z0-9]+)/)?.[1]
            if (episodeId && !episodes.find(e => e.id === episodeId)) {
              episodes.push({
                id: episodeId,
                url: item.url.startsWith('http') ? item.url : `https://www.xiaoyuzhoufm.com${item.url}`,
                title: (item.name || '未知标题').substring(0, 80)
              })
            }
          }
        })
      }
    } catch (e) { /* not valid JSON-LD */ }
  })

  // fallback to DOM extraction
  if (episodes.length === 0) {
    episodes = parseEpisodeList($)
  }

  console.log(`✓ 找到 ${episodes.length} 集节目`)
  return { podcastName, podcastCover, podcastUrl, episodes }
}

function parseLinkFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在：${filePath}`)
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const episodes = []

  content.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const episodeId = trimmed.match(/episode\/([a-zA-Z0-9]+)/)?.[1]
      if (episodeId) {
        episodes.push({
          id: episodeId,
          url: trimmed.startsWith('http') ? trimmed : `https://www.xiaoyuzhoufm.com/episode/${episodeId}`,
          title: null
        })
      }
    }
  })

  console.log(`✓ 从文件读取 ${episodes.length} 个链接`)
  return { episodes }
}

function selectEpisodes(episodes) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

    console.log('\n📋 剧集列表:\n')
    episodes.forEach((e, i) => console.log(`  ${i + 1}. ${e.title}`))
    console.log('\n输入要下载的编号（逗号分隔如 1,3,5，或 all 全选）:')

    rl.question('> ', (answer) => {
      rl.close()
      const trimmed = answer.trim().toLowerCase()

      if (trimmed === 'all') {
        resolve(episodes)
        return
      }

      const selected = []
      const nums = trimmed.split(',').map(s => parseInt(s.trim(), 10)).filter(n => n >= 1 && n <= episodes.length)
      for (const n of nums) {
        if (!selected.find(e => e.id === episodes[n - 1].id)) {
          selected.push(episodes[n - 1])
        }
      }

      if (selected.length === 0) {
        console.log('未选择任何剧集')
        resolve([])
      } else {
        console.log(`\n已选择 ${selected.length} 集`)
        resolve(selected)
      }
    })
  })
}

async function batchProcess(episodes, options = {}) {
  const { outputDir, action = 'list', limit = 0, delay = 1000, force = false, embedCover = true } = options
  const results = { success: [], failed: [], skipped: [] }

  if (action === 'download' && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
    console.log(`\n📁 创建目录：${outputDir}`)
  }

  const total = limit > 0 ? Math.min(episodes.length, limit) : episodes.length
  console.log(`\n📋 处理 ${total}/${episodes.length} 集节目\n`)

  for (let i = 0; i < total; i++) {
    const episode = episodes[i]
    console.log(`[${i + 1}/${total}] ${episode.title || episode.id}`)
    console.log(`    ${episode.url}`)

    try {
      if (action === 'list') {
        console.log(`    ✓ 待处理\n`)
        results.success.push(episode)
        continue
      }

      const info = await extractEpisodeInfo(episode.url)

      if (action === 'extract') {
        console.log(`    ✓ 音频：${info.audioUrl.substring(0, 60)}...`)
        if (info.coverUrl) console.log(`    ✓ 封面：${info.coverUrl.substring(0, 60)}...`)
        results.success.push(info)
      } else if (action === 'download') {
        const filename = generateFilename(info)
        const outputPath = path.join(outputDir, filename)

        if (fs.existsSync(outputPath) && !force) {
          console.log(`    ⏭️  已存在，跳过\n`)
          results.skipped.push({ ...info, file: filename })
          continue
        }

        console.log(`    📥 下载：${filename}`)
        let lastProgress = 0
        await downloadAudio(info.audioUrl, outputPath, (downloaded, totalSize) => {
          const percent = Math.round((downloaded / totalSize) * 100)
          if (percent >= lastProgress + 10 || percent === 100) {
            process.stdout.write(`\r       进度：${percent}%`)
            lastProgress = percent
          }
        })
        console.log('\n    ✅ 音频完成')

        if (embedCover && info.coverUrl) {
          try {
            await embedCover(outputPath, info.coverUrl, info)
            console.log('    ✅ 封面已嵌入')
          } catch (e) {
            console.log(`    ⚠️  封面失败：${e.message}`)
          }
        }
        results.success.push({ ...info, file: filename })
      }
    } catch (error) {
      console.log(`    ❌ 失败：${error.message}`)
      results.failed.push({ ...episode, error: error.message })
    }

    if (i < total - 1 && delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    console.log('')
  }

  return results
}

function printStats(results) {
  console.log('\n📊 处理统计:')
  console.log(`  成功：${results.success.length}`)
  console.log(`  失败：${results.failed.length}`)
  console.log(`  跳过：${results.skipped.length}`)

  if (results.failed.length > 0) {
    console.log('\n  失败的条目:')
    results.failed.forEach(item => console.log(`    - ${item.title || item.id}: ${item.error}`))
  }
}

module.exports = { parsePodcastPage, parseLinkFile, batchProcess, printStats, selectEpisodes, cleanPodcastName }

function getArgValue(args, shortFlag, longFlag) {
  const idx = args.indexOf(shortFlag)
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1]
  const idx2 = args.indexOf(longFlag)
  if (idx2 >= 0 && idx2 + 1 < args.length) return args[idx2 + 1]
  return null
}

// CLI
async function main() {
  const args = process.argv.slice(2)
  const cmdIndex = args.indexOf('--cmd')
  const command = cmdIndex >= 0 ? args[cmdIndex + 1] : (args[0] || 'parse')
  const cleanArgs = cmdIndex >= 0 ? [...args.slice(0, cmdIndex), ...args.slice(cmdIndex + 2)] : args

  if (cleanArgs.includes('-h') || cleanArgs.includes('--help')) {
    console.log(`
🎵 xyz-dl - 批量解析器

用法:
  xyz-dl parse <播客主页>
  xyz-dl select <播客主页> [选项]    交互式选择下载
  xyz-dl batch <链接文件> [选项]

选项:
  -a, --action <动作>     list | extract | download
  -o, --output <目录>     下载目录（默认: ~/Desktop/<播客名>）
  -l, --limit <数量>      限制数量
  -d, --delay <毫秒>      请求间隔
  --force                 覆盖文件
  --no-cover              不嵌入封面
`)
    process.exit(0)
  }

  let source = cleanArgs[0]
  let fromFile = command === 'batch'

  if (cleanArgs[0] === '-f' || cleanArgs[0] === '--file') {
    fromFile = true
    source = cleanArgs[1]
  }

  if (!source) {
    console.log('用法：xyz-dl parse <播客主页>  或  xyz-dl select <播客主页>')
    process.exit(0)
  }

  const action = getArgValue(cleanArgs, '-a', '--action') || (command === 'select' ? 'download' : 'list')
  const outputDirCustom = getArgValue(cleanArgs, '-o', '--output')
  const limit = parseInt(getArgValue(cleanArgs, '-l', '--limit') || '0')
  const delay = parseInt(getArgValue(cleanArgs, '-d', '--delay') || '1000')
  const force = cleanArgs.includes('--force')
  const embedCoverFlag = !cleanArgs.includes('--no-cover')

  console.log('🎵 xyz-dl - 批量解析器\n')

  const data = fromFile ? parseLinkFile(source) : await parsePodcastPage(source)
  let episodes = data.episodes

  if (command === 'select') {
    episodes = await selectEpisodes(episodes)
    if (episodes.length === 0) {
      console.log('未选择任何节目，退出')
      process.exit(0)
    }
  }

  const outputDir = outputDirCustom || path.join(getDesktopPath(), data.podcastName || 'podcasts')
  const results = await batchProcess(episodes, { action, outputDir, limit, delay, force, embedCover: embedCoverFlag })
  printStats(results)
}

if (require.main === module) {
  main()
}
