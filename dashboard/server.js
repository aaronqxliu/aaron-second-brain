/**
 * Aaron Second Brain — Dashboard API Server
 *
 * Serves the static dashboard UI and provides read-only API endpoints
 * that scan the knowledge-base file system (10_Inbox … 50_Templates).
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const WORKSPACE = path.resolve(__dirname, '..');

/* ────────────────────────────────────────────
   Directory metadata
   ──────────────────────────────────────────── */
const KNOWLEDGE_DIRS = [
  { name: '10_Inbox',            label: '📥 收件箱',   description: '选题评估卡片' },
  { name: '20_Knowledge_Atlas',  label: '📊 知识图谱', description: '深度研报' },
  { name: '30_Scripts_Archive',  label: '🎬 脚本库',   description: '视频脚本' },
  { name: '40_MOC',              label: '🗺️ 主题地图', description: 'Maps of Content' },
  { name: '50_Templates',        label: '📋 模板',     description: '可复用模板' },
];

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */
function scanDirectory(dirPath, relativePath) {
  const items = [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const fullPath = path.join(dirPath, entry.name);
      const relPath  = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        items.push({
          name: entry.name, path: relPath, type: 'directory',
          children: scanDirectory(fullPath, relPath),
        });
      } else if (entry.name.endsWith('.md')) {
        const stat = fs.statSync(fullPath);
        items.push({
          name: entry.name, path: relPath, type: 'file',
          size: stat.size, modified: stat.mtime.toISOString(),
        });
      }
    }
  } catch (_) { /* directory may not exist */ }

  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    if (a.modified && b.modified) return new Date(b.modified) - new Date(a.modified);
    return a.name.localeCompare(b.name);
  });
  return items;
}

function isInsideWorkspace(p) {
  return path.resolve(p).startsWith(WORKSPACE);
}

/* ────────────────────────────────────────────
   API: GET /api/files — directory tree
   ──────────────────────────────────────────── */
app.get('/api/files', (_req, res) => {
  const tree = KNOWLEDGE_DIRS.map(dir => ({
    ...dir,
    type: 'directory',
    path: dir.name,
    children: scanDirectory(path.join(WORKSPACE, dir.name), dir.name),
  }));
  res.json(tree);
});

/* ────────────────────────────────────────────
   API: GET /api/file?path=… — read single file
   ──────────────────────────────────────────── */
app.get('/api/file', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'Missing path' });

  const fullPath = path.resolve(WORKSPACE, filePath);
  if (!isInsideWorkspace(fullPath)) return res.status(403).json({ error: 'Forbidden' });

  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const stat    = fs.statSync(fullPath);
    res.json({
      content, path: filePath,
      name: path.basename(filePath),
      modified: stat.mtime.toISOString(),
      size: stat.size,
    });
  } catch (_) {
    res.status(404).json({ error: 'File not found' });
  }
});

/* ────────────────────────────────────────────
   API: GET /api/topics — aggregate pipeline
   ──────────────────────────────────────────── */
app.get('/api/topics', (_req, res) => {
  const topics = {};

  const stages = [
    { dir: '10_Inbox',           suffix: '评估卡片', key: 'evaluation' },
    { dir: '20_Knowledge_Atlas', suffix: '深度研报', key: 'research' },
    { dir: '30_Scripts_Archive', suffix: '脚本',     key: 'script' },
  ];

  for (const { dir, suffix, key } of stages) {
    const dirPath = path.join(WORKSPACE, dir);
    let files;
    try { files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md') && f !== 'README.md'); }
    catch (_) { continue; }

    for (const file of files) {
      const re = new RegExp(
        `^(\\d{4}-\\d{2}-\\d{2})_(.+)_(?:评估卡片|深度研报|脚本)\\.md$`
      );
      const m = file.match(re);
      if (!m) continue;

      const [, date, slug] = m;
      if (!topics[slug]) {
        topics[slug] = {
          slug, firstDate: date,
          stages: { evaluation: null, research: null, script: null },
        };
      }

      const fullPath = path.join(dirPath, file);
      const content  = fs.readFileSync(fullPath, 'utf-8');
      const stat     = fs.statSync(fullPath);

      let score  = null;
      let status = null;
      let title  = slug.replace(/-/g, ' ');

      const sm = content.match(/综合评分[：:]\s*(\d+(?:\.\d+)?)\s*[/／]\s*10/);
      if (sm) score = parseFloat(sm[1]);

      const stm = content.match(/评估状态[：:]\s*(.+)/);
      if (stm) status = stm[1].trim();

      const tm = content.match(/选题名称[：:]\s*(.+)/);
      if (tm) title = tm[1].trim();

      topics[slug].stages[key] = {
        file, dir, path: path.join(dir, file),
        date, modified: stat.mtime.toISOString(),
        score, status, title,
      };

      if (title && title !== slug.replace(/-/g, ' ')) {
        topics[slug].title = title;
      }
    }
  }

  const result = Object.values(topics)
    .map(t => ({ ...t, title: t.title || t.slug.replace(/-/g, ' ') }))
    .sort((a, b) => b.firstDate.localeCompare(a.firstDate));

  res.json(result);
});

/* ────────────────────────────────────────────
   API: GET /api/search?q=… — full-text search
   ──────────────────────────────────────────── */
app.get('/api/search', (req, res) => {
  const query = (req.query.q || '').toLowerCase().trim();
  if (!query) return res.json([]);

  const results = [];

  for (const dir of KNOWLEDGE_DIRS) {
    const dirPath = path.join(WORKSPACE, dir.name);
    let files;
    try { files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md')); }
    catch (_) { continue; }

    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const content  = fs.readFileSync(fullPath, 'utf-8');

      if (content.toLowerCase().includes(query) || file.toLowerCase().includes(query)) {
        const lines   = content.split('\n');
        const matches = [];
        for (let i = 0; i < lines.length && matches.length < 3; i++) {
          if (lines[i].toLowerCase().includes(query)) {
            matches.push({ line: i + 1, text: lines[i].trim().slice(0, 120) });
          }
        }
        results.push({ file, path: path.join(dir.name, file), dir: dir.name, dirLabel: dir.label, matches });
      }
    }
  }
  res.json(results);
});

/* ────────────────────────────────────────────
   Static files + SPA fallback
   ──────────────────────────────────────────── */
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

/* ────────────────────────────────────────────
   Start
   ──────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`\n  🧠  Aaron Second Brain Dashboard`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  📍  http://localhost:${PORT}`);
  console.log(`  📁  ${WORKSPACE}\n`);
});
