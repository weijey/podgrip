/**
 * podgrip - 小宇宙播客下载器
 * Grip your podcasts from the cosmos.
 *
 * 程序化使用 API
 */

const {
  extractEpisodeInfo,
  generateFilename,
  downloadAudio,
  downloadFile,
  embedCover
} = require('./lib/extractor')

module.exports = {
  extractEpisodeInfo,
  generateFilename,
  downloadAudio,
  downloadFile,
  embedCover,

  async download(episodeUrl, options = {}) {
    const { outputDir = '.', filename = null, embedCover: shouldEmbedCover = true } = options
    const fs = require('fs')
    const path = require('path')

    const info = await extractEpisodeInfo(episodeUrl)
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

    const outputFile = filename || generateFilename(info)
    const outputPath = path.join(outputDir, outputFile)

    console.log(`📥 下载：${outputFile}`)
    await downloadAudio(info.audioUrl, outputPath)
    console.log('✅ 音频下载完成')

    if (shouldEmbedCover && info.coverUrl) {
      console.log('🎨 嵌入封面...')
      await embedCover(outputPath, info.coverUrl, info)
      console.log('✅ 封面已嵌入')
    }

    return { success: true, file: outputPath, info }
  }
}
