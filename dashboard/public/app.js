/**
 * Aaron Second Brain — Dashboard Frontend
 *
 * Handles tab switching, file-tree browsing, Markdown rendering,
 * topic pipeline visualisation, and full-text search.
 */

/* ══════════════════════════════════
   State
   ══════════════════════════════════ */
const state = {
  activeTab: 'knowledge',
  fileTree: [],
  topics: [],
  currentFile: null,
  expandedTopics: new Set(),
  expandedDirs: new Set(),
};

/* ══════════════════════════════════
   Init
   ══════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupSearch();
  setupResize();
  await Promise.all([loadFileTree(), loadTopics()]);
});

/* ══════════════════════════════════
   Tab Management
   ══════════════════════════════════ */
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  // Initialise indicator after a tick so layout is settled
  requestAnimationFrame(updateTabIndicator);
  window.addEventListener('resize', updateTabIndicator);
}

function switchTab(name) {
  state.activeTab = name;
  document.querySelectorAll('.tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-content').forEach(c =>
    c.classList.toggle('active', c.id === `content-${name}`));
  updateTabIndicator();
}

function updateTabIndicator() {
  const btn = document.querySelector('.tab-btn.active');
  const bar = document.getElementById('tab-indicator');
  if (!btn || !bar) return;
  const nav = document.getElementById('main-tabs');
  const navRect = nav.getBoundingClientRect();
  const btnRect = btn.getBoundingClientRect();
  bar.style.left  = (btnRect.left - navRect.left) + 'px';
  bar.style.width  = btnRect.width + 'px';
}

/* ══════════════════════════════════
   File Tree
   ══════════════════════════════════ */
async function loadFileTree() {
  try {
    const res  = await fetch('/api/files');
    state.fileTree = await res.json();
    renderFileTree();
  } catch (e) { console.error('loadFileTree', e); }
}

function renderFileTree() {
  const el = document.getElementById('file-tree');
  el.innerHTML = '';
  state.fileTree.forEach(dir => el.appendChild(buildDirNode(dir, 0)));
}

function buildDirNode(node, depth) {
  const wrap = document.createElement('div');
  wrap.className = 'tree-dir';

  const open = state.expandedDirs.has(node.path);
  const count = countFiles(node);

  const hdr = document.createElement('div');
  hdr.className = 'tree-dir-header';
  hdr.style.paddingLeft = (depth * 16 + 8) + 'px';
  hdr.innerHTML = `
    <span class="tree-arrow ${open ? 'expanded' : ''}">▶</span>
    <span class="tree-dir-icon">${node.label ? node.label.split(' ')[0] : '📁'}</span>
    <span class="tree-dir-name">${node.label || node.name}</span>
    <span class="tree-count">${count}</span>`;
  hdr.addEventListener('click', () => {
    open ? state.expandedDirs.delete(node.path) : state.expandedDirs.add(node.path);
    renderFileTree();
  });
  wrap.appendChild(hdr);

  if (open && node.children?.length) {
    const kids = document.createElement('div');
    kids.className = 'tree-children';
    node.children.forEach(child => {
      kids.appendChild(
        child.type === 'directory'
          ? buildDirNode(child, depth + 1)
          : buildFileNode(child, depth + 1)
      );
    });
    wrap.appendChild(kids);
  }
  return wrap;
}

function buildFileNode(node, depth) {
  const div = document.createElement('div');
  div.className = 'tree-file' + (state.currentFile === node.path ? ' active' : '');
  div.style.paddingLeft = (depth * 16 + 28) + 'px';

  let icon = '📄';
  if (node.name.includes('评估卡片')) icon = '📋';
  else if (node.name.includes('深度研报')) icon = '📊';
  else if (node.name.includes('脚本'))     icon = '🎬';
  else if (node.name.includes('template') || node.name.includes('模板')) icon = '📑';

  div.innerHTML = `
    <span class="tree-file-icon">${icon}</span>
    <span class="tree-file-name">${node.name}</span>`;
  div.addEventListener('click', () => openFile(node.path));
  return div;
}

function countFiles(node) {
  if (!node.children) return 0;
  return node.children.reduce((n, c) =>
    n + (c.type === 'file' ? 1 : countFiles(c)), 0);
}

/* ══════════════════════════════════
   File Viewer
   ══════════════════════════════════ */
async function openFile(filePath) {
  state.currentFile = filePath;
  renderFileTree();                     // refresh active highlight

  try {
    const res  = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
    const data = await res.json();
    showMarkdown(data);
  } catch (e) { console.error('openFile', e); }
}

function showMarkdown(file) {
  document.getElementById('viewer-empty').classList.add('hidden');
  const box = document.getElementById('viewer-content');
  box.classList.remove('hidden');

  // Breadcrumb
  const parts = file.path.split('/');
  document.getElementById('viewer-breadcrumb').innerHTML = parts
    .map((p, i) => {
      const cls = i === parts.length - 1 ? 'current' : '';
      return `<span class="breadcrumb-item ${cls}">${p}</span>`;
    }).join('<span class="breadcrumb-sep">/</span>');

  // Meta
  const d = new Date(file.modified);
  document.getElementById('viewer-meta').innerHTML =
    `<span>📅 ${d.toLocaleDateString('zh-CN')}</span>
     <span>📏 ${(file.size / 1024).toFixed(1)} KB</span>`;

  // Strip front-matter then render
  let md = file.content;
  const fm = md.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
  if (fm) md = fm[1];

  document.getElementById('markdown-body').innerHTML = marked.parse(md);

  // Scroll to top
  document.querySelector('.kb-viewer').scrollTop = 0;
}

/* ══════════════════════════════════
   Topics Pipeline
   ══════════════════════════════════ */
async function loadTopics() {
  try {
    const res = await fetch('/api/topics');
    state.topics = await res.json();
    renderTopics();
    const badge = document.getElementById('topics-count');
    badge.textContent = state.topics.length || '';
  } catch (e) { console.error('loadTopics', e); }
}

function renderTopics() {
  const list  = document.getElementById('topics-list');
  const stats = document.getElementById('topics-stats');

  if (!state.topics.length) {
    list.innerHTML = `
      <div class="topics-empty">
        <span class="empty-icon">📋</span>
        <h3>暂无选题记录</h3>
        <p>在 Antigravity IDE 中评估选题后，它们会自动出现在这里</p>
      </div>`;
    stats.innerHTML = '';
    return;
  }

  const evals   = state.topics.filter(t => t.stages.evaluation).length;
  const reports = state.topics.filter(t => t.stages.research).length;
  const scripts = state.topics.filter(t => t.stages.script).length;
  stats.innerHTML =
    `<div class="stat-chip">📋 评估 <strong>${evals}</strong></div>
     <div class="stat-chip">📊 研报 <strong>${reports}</strong></div>
     <div class="stat-chip">🎬 脚本 <strong>${scripts}</strong></div>`;

  list.innerHTML = '';
  state.topics.forEach(t => list.appendChild(buildTopicCard(t)));
}

function buildTopicCard(topic) {
  const card = document.createElement('div');
  card.className = 'topic-card';
  const open = state.expandedTopics.has(topic.slug);
  if (open) card.classList.add('expanded');

  const ev = topic.stages.evaluation;
  const rp = topic.stages.research;
  const sc = topic.stages.script;

  // Status
  let badge = '待评估', cls = 'status-pending';
  if (ev?.status) {
    badge = ev.status;
    cls = badge.includes('通过') ? 'status-pass'
        : badge.includes('回避') ? 'status-reject'
        : 'status-pending';
  }

  const score = ev?.score != null ? `${ev.score}/10` : '—';

  // Determine pipeline node states
  const evState = ev ? 'completed' : 'pending';
  const rpState = rp ? 'completed' : (ev ? 'active' : 'pending');
  const scState = sc ? 'completed' : (rp ? 'active' : 'pending');

  card.innerHTML = `
    <div class="card-header" data-slug="${topic.slug}">
      <div class="card-title-row">
        <h3 class="card-title">${topic.title}</h3>
        <div class="card-score">${score}</div>
      </div>
      <div class="card-meta-row">
        <span class="card-date">${topic.firstDate}</span>
        <span class="card-status ${cls}">${badge}</span>
      </div>
      <div class="pipeline">
        <div class="pipeline-node ${evState}">
          <div class="pipeline-dot"></div>
          <span class="pipeline-label">评估</span>
        </div>
        <div class="pipeline-line ${ev && rp ? 'completed' : ''}"></div>
        <div class="pipeline-node ${rpState}">
          <div class="pipeline-dot"></div>
          <span class="pipeline-label">研报</span>
        </div>
        <div class="pipeline-line ${rp && sc ? 'completed' : ''}"></div>
        <div class="pipeline-node ${scState}">
          <div class="pipeline-dot"></div>
          <span class="pipeline-label">脚本</span>
        </div>
      </div>
    </div>
    <div class="card-body ${open ? '' : 'hidden'}">
      <div class="stage-sections">
        ${stageHTML('📋 选题评估', ev)}
        ${stageHTML('📊 深度研报', rp)}
        ${stageHTML('🎬 视频脚本', sc)}
      </div>
    </div>`;

  // Expand / collapse
  card.querySelector('.card-header').addEventListener('click', () => {
    open ? state.expandedTopics.delete(topic.slug) : state.expandedTopics.add(topic.slug);
    renderTopics();
  });

  // View buttons → switch to KB tab and open file
  card.querySelectorAll('.stage-view-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      switchTab('knowledge');
      // Expand the parent directory so the file is visible
      const dir = btn.dataset.path.split('/')[0];
      state.expandedDirs.add(dir);
      openFile(btn.dataset.path);
    });
  });

  return card;
}

function stageHTML(label, data) {
  const done = !!data;
  return `
    <div class="stage-section ${done ? 'stage-done' : 'stage-pending'}">
      <div class="stage-header">
        <span class="stage-label">${label}</span>
        <span class="stage-status">${done ? '✅ 已完成' : '🔲 未开始'}</span>
      </div>
      ${done ? `<div class="stage-meta">${data.file}</div>` : ''}
      <div class="stage-actions">
        ${done ? `<button class="stage-view-btn" data-path="${data.path}">查看内容 →</button>` : ''}
      </div>
    </div>`;
}

/* ══════════════════════════════════
   Search
   ══════════════════════════════════ */
function setupSearch() {
  let timer;
  const kbInput = document.getElementById('kb-search');
  kbInput.addEventListener('input', e => {
    clearTimeout(timer);
    const q = e.target.value.trim();
    if (q.length < 2) { hideSearchOverlay(); return; }
    timer = setTimeout(() => doSearch(q), 280);
  });
  kbInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') { kbInput.value = ''; hideSearchOverlay(); }
  });

  document.getElementById('topics-search').addEventListener('input', e => {
    filterTopicCards(e.target.value.toLowerCase().trim());
  });

  document.getElementById('close-search').addEventListener('click', () => {
    document.getElementById('kb-search').value = '';
    hideSearchOverlay();
  });
  document.getElementById('search-backdrop').addEventListener('click', () => {
    document.getElementById('kb-search').value = '';
    hideSearchOverlay();
  });
}

async function doSearch(q) {
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const results = await res.json();
    showSearchResults(results, q);
  } catch (e) { console.error('search', e); }
}

function showSearchResults(results, query) {
  const overlay = document.getElementById('search-overlay');
  const body    = document.getElementById('search-results');
  overlay.classList.remove('hidden');

  if (!results.length) {
    body.innerHTML = `<div class="search-empty">未找到包含「${esc(query)}」的内容</div>`;
    return;
  }

  body.innerHTML = results.map(r => `
    <div class="search-result-item" data-path="${r.path}">
      <div class="search-result-file">
        <span class="search-result-dir">${r.dirLabel}</span>
        <span class="search-result-name">${esc(r.file)}</span>
      </div>
      <div class="search-result-matches">
        ${r.matches.map(m => `
          <div class="search-match-line">
            <span class="match-line-num">L${m.line}</span>
            <span class="match-text">${highlight(m.text, query)}</span>
          </div>`).join('')}
      </div>
    </div>`).join('');

  body.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const dir = item.dataset.path.split('/')[0];
      state.expandedDirs.add(dir);
      openFile(item.dataset.path);
      hideSearchOverlay();
      document.getElementById('kb-search').value = '';
    });
  });
}

function hideSearchOverlay() {
  document.getElementById('search-overlay').classList.add('hidden');
}

function filterTopicCards(q) {
  document.querySelectorAll('.topic-card').forEach((card, i) => {
    const t = state.topics[i];
    if (!t) return;
    const match = !q || t.title.toLowerCase().includes(q) || t.slug.includes(q);
    card.style.display = match ? '' : 'none';
  });
}

/* ══════════════════════════════════
   Sidebar Resize
   ══════════════════════════════════ */
function setupResize() {
  const handle  = document.getElementById('resize-handle');
  const sidebar = document.getElementById('kb-sidebar');
  if (!handle || !sidebar) return;

  let startX, startW;
  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    startX = e.clientX;
    startW = sidebar.offsetWidth;
    handle.classList.add('active');
    const onMove = ev => { sidebar.style.width = Math.max(200, Math.min(600, startW + ev.clientX - startX)) + 'px'; };
    const onUp   = () => { handle.classList.remove('active'); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

/* ══════════════════════════════════
   Helpers
   ══════════════════════════════════ */
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function highlight(text, q) {
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return esc(text).replace(new RegExp(`(${safe})`, 'gi'), '<mark>$1</mark>');
}
