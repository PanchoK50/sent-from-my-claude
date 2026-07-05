import { createServer } from 'http';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import {
  sendOne,
  verifyConnection,
  SENDER_NAME,
  SENDER_EMAIL,
  CAMPAIGN_LABEL,
  EMAILS_DIR,
  type EmailEntry,
} from './mailer.js';

const PORT = parseInt(process.env.PORT ?? '3333', 10);

type StoredEmail = EmailEntry & { _file: string };

function listEmails(): StoredEmail[] {
  return readdirSync(EMAILS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => {
      const data = JSON.parse(readFileSync(resolve(EMAILS_DIR, f), 'utf-8')) as EmailEntry;
      return { ...data, _file: f };
    });
}

function readEmail(file: string): EmailEntry {
  return JSON.parse(readFileSync(resolve(EMAILS_DIR, file), 'utf-8'));
}

function writeEmail(file: string, data: EmailEntry): void {
  writeFileSync(resolve(EMAILS_DIR, file), JSON.stringify(data, null, 2), 'utf-8');
}

function htmlToPlainText(htmlStr: string): string {
  let text = htmlStr;
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');
  text = text.replace(/<\/div>\s*<div[^>]*>/gi, '\n');
  text = text.replace(/<hr[^>]*>/gi, '\n---\n');
  text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>[^<]*<\/a>/gi, '$1');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&#x27;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

function readBody(req: import('http').IncomingMessage): Promise<string> {
  return new Promise((res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => res(body));
  });
}

const HTML_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${CAMPAIGN_LABEL} - Review & Send</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; display: flex; height: 100vh; color: #1f2937; }
#sidebar { width: 320px; border-right: 1px solid #e5e7eb; overflow-y: auto; background: #f9fafb; flex-shrink: 0; }
#topbar { padding: 10px 14px; border-bottom: 1px solid #e5e7eb; background: #fff; position: sticky; top: 0; }
#topbar #count { font-size: 12px; color: #6b7280; }
#search { width: 100%; margin-top: 8px; padding: 6px 8px; font-size: 12px; border: 1px solid #d1d5db; border-radius: 5px; }
.item { padding: 10px 14px; border-bottom: 1px solid #f0f0f0; cursor: pointer; }
.item:hover { background: #eef2ff; }
.item.active { background: #e0e7ff; }
.item .name { font-weight: 600; font-size: 13px; display: flex; justify-content: space-between; align-items: center; gap: 4px; }
.item .role { font-size: 11px; color: #4b5563; margin-top: 2px; }
.item .meta { font-size: 10px; color: #9ca3af; margin-top: 2px; }
.badge { font-size: 9px; padding: 1px 6px; border-radius: 99px; font-weight: 600; white-space: nowrap; }
.badge.sent { background: #dcfce7; color: #166534; }
.badge.variant { background: #ede9fe; color: #5b21b6; }
#main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
#info { padding: 12px 20px; border-bottom: 1px solid #e5e7eb; background: #fff; }
#info h2 { font-size: 16px; }
#info .sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
#info .chips { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
#info .chip { font-size: 11px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 5px; padding: 2px 8px; }
#info .chip a { color: #2563eb; text-decoration: none; }
#fields { padding: 8px 20px; border-bottom: 1px solid #e5e7eb; background: #fff; }
.field-row { display: flex; gap: 8px; margin-bottom: 4px; align-items: center; }
.field-row label { font-size: 11px; font-weight: 600; min-width: 56px; }
.field-row input { flex: 1; padding: 5px 8px; font-size: 12px; border: 1px solid #d1d5db; border-radius: 4px; }
#email-frame { flex: 1; border: none; width: 100%; background: #fff; }
#actions { padding: 12px 20px; border-top: 1px solid #e5e7eb; background: #f9fafb; display: flex; gap: 10px; align-items: center; }
button { padding: 8px 18px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; }
#save-btn { background: #e5e7eb; color: #374151; }
#save-btn:hover { background: #d1d5db; }
#send-btn { background: #16a34a; color: #fff; }
#send-btn:hover { background: #15803d; }
#send-btn:disabled { background: #d1d5db; color: #9ca3af; cursor: not-allowed; }
#status { font-size: 12px; color: #6b7280; }
.sent-banner { background: #dcfce7; color: #166534; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; }
#empty { flex: 1; display: flex; align-items: center; justify-content: center; color: #9ca3af; }
</style>
</head>
<body>
<div id="sidebar">
  <div id="topbar">
    <div id="count"></div>
    <input id="search" placeholder="Search name / company / variant...">
  </div>
  <div id="list"></div>
</div>
<div id="main">
  <div id="empty">Select a contact on the left.</div>
  <div id="content" style="display:none; flex:1; flex-direction:column; overflow:hidden;">
    <div id="info"></div>
    <div id="fields">
      <div class="field-row"><label>To:</label><input id="field-to"></div>
      <div class="field-row"><label>CC:</label><input id="field-cc"></div>
      <div class="field-row"><label>Subject:</label><input id="field-subject"></div>
    </div>
    <iframe id="email-frame"></iframe>
    <div id="actions">
      <button id="save-btn" onclick="save()">Save edits</button>
      <button id="send-btn" onclick="send()">Send</button>
      <span id="status"></span>
    </div>
  </div>
</div>
<script>
const SENDER = ${JSON.stringify(`${SENDER_NAME} <${SENDER_EMAIL}>`)};
const CAMPAIGN = ${JSON.stringify(CAMPAIGN_LABEL)};
let emails = [];
let current = -1;
let filter = '';

async function loadEmails() {
  const res = await fetch('/api/emails');
  emails = await res.json();
  renderList();
}

function filtered() {
  if (!filter) return emails;
  const q = filter.toLowerCase();
  return emails.filter(e => {
    const c = e.contact || {};
    return [c.first_name, c.last_name, c.company, c.variant, e.to].join(' ').toLowerCase().includes(q);
  });
}

function variantBadge(c) {
  if (!c.variant) return '';
  return '<span class="badge variant">' + String(c.variant).toUpperCase() + '</span>';
}

function renderList() {
  const list = document.getElementById('list');
  const items = filtered();
  const sentCount = emails.filter(e => e.sent_at).length;
  const variantCounts = {};
  emails.forEach(e => {
    const v = (e.contact || {}).variant;
    if (v) variantCounts[v] = (variantCounts[v] || 0) + 1;
  });
  const variantStr = Object.entries(variantCounts).map(([k, v]) => v + ' ' + k).join(' / ');
  document.getElementById('count').textContent =
    CAMPAIGN + ' · ' + emails.length + ' contacts · ' + sentCount + ' sent' + (variantStr ? ' · ' + variantStr : '');
  list.innerHTML = items.map((e) => {
    const c = e.contact || {};
    const idx = emails.indexOf(e);
    const displayName = ((c.first_name || '') + ' ' + (c.last_name || '')).trim() || (c.company || e.to);
    return \`
    <div class="item \${idx === current ? 'active' : ''}" onclick="select(\${idx})">
      <div class="name"><span>\${displayName}</span>
        <span>\${e.sent_at ? '<span class="badge sent">SENT</span> ' : ''}\${variantBadge(c)}</span></div>
      <div class="role">\${c.company || ''}</div>
      <div class="meta">\${e.to}</div>
    </div>\`;
  }).join('');
}

function select(i) {
  current = i;
  renderList();
  showEmail();
}

function showEmail() {
  const e = emails[current];
  if (!e) return;
  document.getElementById('empty').style.display = 'none';
  document.getElementById('content').style.display = 'flex';
  const c = e.contact || {};

  const chips = [];
  if (c.variant) chips.push('<span class="chip">signature: '+c.variant+'</span>');
  if (c.company) chips.push('<span class="chip">'+c.company+'</span>');

  document.getElementById('info').innerHTML =
    '<h2>'+(c.first_name||'')+' '+(c.last_name||'')+'</h2>'
    + '<div class="sub">'+(c.company?c.company:'')+'</div>'
    + (e.sent_at ? '<div class="chips"><span class="sent-banner">✓ Sent '+new Date(e.sent_at).toLocaleString()+'</span></div>' : '')
    + '<div class="chips">'+chips.join('')+'</div>';

  document.getElementById('field-to').value = e.to;
  document.getElementById('field-cc').value = e.cc || '';
  document.getElementById('field-subject').value = e.subject;

  const iframe = document.getElementById('email-frame');
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write('<!DOCTYPE html><html><head><style>'
    + 'body{font-family:Calibri,sans-serif;font-size:11pt;padding:24px;margin:0;}'
    + 'p{margin:0 0 12px 0;} hr{border:none;border-top:1px solid #ccc;margin:20px 0;} a{color:#1a73e8;}'
    + '</style></head><body contenteditable="true">'+e.html_body+'</body></html>');
  doc.close();

  const sendBtn = document.getElementById('send-btn');
  sendBtn.disabled = !!e.sent_at;
  sendBtn.textContent = e.sent_at ? 'Already sent' : 'Send';
  document.getElementById('status').textContent = e.sent_at ? '' : 'From: ' + SENDER;
}

function getEditedHtml() {
  const iframe = document.getElementById('email-frame');
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  return doc.body.innerHTML;
}

function collect() {
  const e = emails[current];
  e.to = document.getElementById('field-to').value;
  e.cc = document.getElementById('field-cc').value;
  e.subject = document.getElementById('field-subject').value;
  e.html_body = getEditedHtml();
  return e;
}

async function save() {
  const e = collect();
  const res = await fetch('/api/save', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ _file: e._file, to: e.to, cc: e.cc, subject: e.subject, html_body: e.html_body }),
  });
  const out = await res.json();
  if (res.ok) {
    emails[current] = { ...out, _file: e._file };
    document.getElementById('status').textContent = 'Saved ' + new Date().toLocaleTimeString();
    renderList();
  } else {
    document.getElementById('status').textContent = 'Save error: ' + (out.error || '');
  }
}

async function send() {
  const e = emails[current];
  if (e.sent_at) return;
  if (!confirm('Send this email to ' + e.to + ' ?')) return;
  await save();
  const btn = document.getElementById('send-btn');
  btn.disabled = true; btn.textContent = 'Sending...';
  document.getElementById('status').textContent = 'Sending to ' + e.to + '...';
  const res = await fetch('/api/send', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ _file: e._file }),
  });
  const out = await res.json();
  if (res.ok && out.success) {
    emails[current] = { ...emails[current], sent_at: out.sent_at, message_id: out.message_id };
    document.getElementById('status').textContent = '✓ Sent (' + out.message_id + ')';
    renderList(); showEmail();
  } else {
    btn.disabled = false; btn.textContent = 'Send';
    document.getElementById('status').textContent = 'Send error: ' + (out.error || 'unknown');
  }
}

document.getElementById('search').addEventListener('input', (ev) => {
  filter = ev.target.value; renderList();
});
document.addEventListener('keydown', (ev) => {
  if ((ev.metaKey || ev.ctrlKey) && ev.key === 's') { ev.preventDefault(); save(); }
});
loadEmails();
</script>
</body>
</html>`;

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(HTML_PAGE);
      return;
    }

    if (req.method === 'GET' && req.url === '/api/emails') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(listEmails()));
      return;
    }

    if (req.method === 'POST' && req.url === '/api/save') {
      const data = JSON.parse(await readBody(req));
      const file: string = data._file;
      const entry = readEmail(file);
      entry.to = data.to;
      entry.cc = data.cc;
      entry.subject = data.subject;
      entry.html_body = data.html_body;
      entry.body = htmlToPlainText(data.html_body);
      writeEmail(file, entry);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(entry));
      return;
    }

    if (req.method === 'POST' && req.url === '/api/send') {
      const data = JSON.parse(await readBody(req));
      const file: string = data._file;
      const entry = readEmail(file);

      if (entry.sent_at) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `already sent ${entry.sent_at}` }));
        return;
      }

      await verifyConnection();
      const messageId = await sendOne(entry);
      const sentAt = new Date().toISOString();
      entry.sent_at = sentAt;
      entry.message_id = messageId;
      writeEmail(file, entry);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message_id: messageId, sent_at: sentAt }));
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
  }
});

server.listen(PORT, () => {
  const n = readdirSync(EMAILS_DIR).filter((f) => f.endsWith('.json')).length;
  console.log(`Review & send UI: http://localhost:${PORT}`);
  console.log(`Campaign: ${CAMPAIGN_LABEL}  ·  ${n} emails  ·  Sender: ${SENDER_NAME} <${SENDER_EMAIL}>`);
});
