const $ = (sel) => document.querySelector(sel)

function showView(id) {
  $("#main-view").classList.add("hidden")
  $("#detail-view").classList.add("hidden")
  $("#add-view").classList.add("hidden")
  $(id).classList.remove("hidden")
}

function showMain() { showView("#main-view"); loadSubscriptions() }
function showAdd() { showView("#add-view") }
function showDetail() { showView("#detail-view") }

async function loadSubscriptions() {
  const list = $("#subscription-list")
  list.innerHTML = '<div class="loading">加载中&hellip;</div>'

  try {
    const res = await fetch("/api/subscriptions")
    const subs = await res.json()
    if (subs.length === 0) {
      list.innerHTML = '<div class="empty-state">暂无订阅<br><span class="dim">点击右上角 + 添加</span></div>'
      return
    }
    list.innerHTML = subs.map((s, i) => `
      <div class="card" onclick="loadEpisodes('${encodeURIComponent(s.url)}', '${s.name}')">
        <div class="card-name">${s.name}</div>
        <div class="card-meta">${s.url}</div>
      </div>
    `).join("")
  } catch {
    list.innerHTML = '<div class="empty-state">加载失败</div>'
  }
}

async function loadEpisodes(url, name) {
  showView("#detail-view")
  $("#detail-title").textContent = name
  const list = $("#episode-list")
  list.innerHTML = '<div class="loading">加载中&hellip;</div>'

  try {
    const res = await fetch("/api/episodes?url=" + url)
    const data = await res.json()
    list.innerHTML = data.episodes.map((ep) => `
      <div class="episode-row">
        <span class="episode-title">${ep.title}</span>
        ${ep.archived
          ? '<span class="episode-status status-archived">已下载</span>'
          : `<button class="btn-download" data-id="${ep.id}" data-title="${ep.title}" onclick="downloadEpisode(this)">下载</button>`
        }
      </div>
    `).join("")
  } catch {
    list.innerHTML = '<div class="empty-state">加载失败</div>'
  }
}

function downloadEpisode(btn) {
  const id = btn.dataset.id
  const title = btn.dataset.title
  btn.disabled = true
  btn.textContent = "队列中"

  const queue = $("#download-queue")
  queue.classList.remove("hidden")

  const item = document.createElement("div")
  item.className = "queue-item"
  item.innerHTML = `<span>${title}</span><span class="queue-progress">等待中</span>`
  item.dataset.id = id
  $("#queue-items").appendChild(item)

  const evt = new EventSource("/api/download/" + id)

  evt.addEventListener("status", (e) => {
    const d = JSON.parse(e.data)
    item.querySelector(".queue-progress").textContent = d.message
  })

  evt.addEventListener("progress", (e) => {
    const d = JSON.parse(e.data)
    item.querySelector(".queue-progress").textContent = d.percent + "%"
  })

  evt.addEventListener("done", (e) => {
    const d = JSON.parse(e.data)
    item.querySelector(".queue-progress").textContent = "✅ " + d.size
    btn.textContent = "已下载"
    btn.classList.add("status-archived")
    btn.classList.remove("btn-download")
    evt.close()
  })

  evt.addEventListener("error", (e) => {
    item.querySelector(".queue-progress").textContent = "❌ 失败"
    btn.disabled = false
    btn.textContent = "重试"
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
    if (!res.ok) throw new Error("解析失败")
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
