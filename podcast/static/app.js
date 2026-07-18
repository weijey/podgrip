const $ = (sel) => document.querySelector(sel)

function showView(id) {
  $("#main-view").classList.add("hidden")
  $("#detail-view").classList.add("hidden")
  $("#add-view").classList.add("hidden")
  $(id).classList.remove("hidden")
}

function showMain() { showView("#main-view"); loadSubscriptions() }
function showAdd() { showView("#add-view") }

async function loadSubscriptions() {
  const list = $("#subscription-list")
  list.innerHTML = '<div class="loading">加载中&hellip;</div>'

  try {
    const res = await fetch("/api/subscriptions")
    const subs = await res.json()
    if (subs.length === 0) {
      list.innerHTML = '<div class="empty-state"><p>暂无订阅</p><span class="dim">点击右上角添加第一个播客</span></div>'
      return
    }
    list.innerHTML = subs.map((s) => `
      <div class="sub-card" onclick="loadEpisodes('${s.url}', '${s.name}')">
        <div class="sub-card-left">
          <div class="sub-card-name">${s.name}</div>
          <div class="sub-card-stats">${s.episodeCount || ""}${s.newCount ? ' <span class="new-badge">+'+s.newCount+'</span>' : ""}</div>
        </div>
        <span class="sub-card-arrow">&rsaquo;</span>
      </div>
    `).join("")
    // enrich with episode counts
    subs.forEach((s) => enrichCard(s.url, s.name))
  } catch {
    list.innerHTML = '<div class="empty-state">加载失败</div>'
  }
}

async function enrichCard(url, name) {
  try {
    const res = await fetch("/api/episodes?url=" + encodeURIComponent(url))
    const data = await res.json()
    const newCount = data.episodes.filter((e) => !e.archived).length
    const cards = [...document.querySelectorAll(".sub-card")]
    const card = cards.find((c) => c.querySelector(".sub-card-name")?.textContent === name)
    if (card) {
      card.querySelector(".sub-card-stats").innerHTML =
        `${data.episodes.length} 集` + (newCount > 0 ? ` <span class="new-badge">+${newCount}</span>` : "")
    }
  } catch { /* quietly */ }
}

async function loadEpisodes(url, name) {
  showView("#detail-view")
  $("#detail-title").textContent = name
  $("#detail-meta").textContent = "加载中&hellip;"
  const list = $("#episode-list")
  list.innerHTML = ""

  try {
    const res = await fetch("/api/episodes?url=" + url)
    const data = await res.json()
    const archived = data.episodes.filter((ep) => ep.archived).length
    $("#detail-meta").textContent = `${data.episodes.length} 集 · ${archived} 已下载 · 输出到 桌面/${data.podcastName}`
    list.innerHTML = data.episodes.map((ep) => `
      <div class="ep-card">
        <span class="ep-title">${ep.title}</span>
        <span class="ep-meta">
          ${ep.archived
            ? '<span class="status-tag tag-done">已下载</span>'
            : `<button class="btn-dl" data-id="${ep.id}" data-title="${ep.title}" onclick="downloadEpisode(this)">下载</button>`
          }
        </span>
      </div>
    `).join("")
  } catch {
    list.innerHTML = '<div class="empty-state">加载失败</div>'
  }
}

function showToast() {
  $("#download-toast").classList.remove("hidden")
}

function downloadEpisode(btn) {
  const id = btn.dataset.id
  const title = btn.dataset.title
  btn.disabled = true
  btn.textContent = "排队中"
  btn.classList.remove("btn-dl")
  btn.classList.add("status-tag", "tag-ing")

  showToast()
  const toast = $("#toast-content")
  const item = document.createElement("div")
  item.className = "toast-item"
  item.innerHTML = `<span class="t-title">${title}</span><span class="t-status">等待中</span>`
  toast.appendChild(item)

  const evt = new EventSource("/api/download/" + id)

  evt.addEventListener("progress", (e) => {
    const d = JSON.parse(e.data)
    item.querySelector(".t-status").textContent = d.percent + "%"
    btn.textContent = d.percent + "%"
  })

  evt.addEventListener("done", (e) => {
    const d = JSON.parse(e.data)
    item.querySelector(".t-status").className = "t-status t-done"
    item.querySelector(".t-status").textContent = "✅ " + d.size
    btn.textContent = "已下载"
    btn.classList.remove("tag-ing")
    btn.classList.add("status-tag", "tag-done")
    btn.disabled = true
    evt.close()
    // hide toast after 4s if no active downloads
    setTimeout(() => {
      if (!$("#toast-content").querySelector(".t-status:not(.t-done):not(.t-fail)")) {
        $("#download-toast").classList.add("hidden")
        $("#toast-content").innerHTML = ""
      }
    }, 4000)
  })

  evt.addEventListener("error", () => {
    item.querySelector(".t-status").className = "t-status t-fail"
    item.querySelector(".t-status").textContent = "❌ 失败"
    btn.textContent = "重试"
    btn.classList.remove("tag-ing")
    btn.classList.add("btn-dl")
    btn.disabled = false
    evt.close()
  })
}

async function handleAdd(e) {
  e.preventDefault()
  const url = $("#add-url").value.trim()
  const status = $("#add-status")
  if (!url) return

  status.textContent = "解析中&hellip;"
  status.className = "dim"

  try {
    const res = await fetch("/api/episodes?url=" + url)
    if (!res.ok) throw new Error("解析失败，请检查链接")
    const data = await res.json()

    await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.podcastName, url }),
    })

    status.textContent = "✅ 已添加：" + data.podcastName
    status.className = "dim"
    $("#add-url").value = ""
  } catch (e) {
    status.textContent = "❌ " + e.message
    status.className = "dim"
  }
}

window.showMain = showMain
window.showAdd = showAdd
window.loadEpisodes = loadEpisodes
window.downloadEpisode = downloadEpisode
window.handleAdd = handleAdd

loadSubscriptions()
