const API_BASE = '/api';

async function apiRequest(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (window.CSRF_TOKEN && ['post','put','patch','delete'].includes((options.method || 'GET').toLowerCase())) {
    headers['X-CSRF-Token'] = window.CSRF_TOKEN;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  let data;
  try { data = await res.json(); } catch (e) { data = {}; }
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('nl-NL');
}

function statusBadge(el, running) {
  const dot = el.querySelector('.status-dot');
  const text = el.querySelector('.status-text span');
  if (running) {
    dot.className = 'status-dot online';
    text.textContent = 'Online';
  } else {
    dot.className = 'status-dot';
    text.textContent = 'Offline';
  }
}

async function loadNginxStatus() {
  try {
    const { nginx } = await apiRequest('/dashboard/stats');
    const el = document.getElementById('header-nginx-status');
    if (el) statusBadge(el, nginx.running);
  } catch (e) {
    console.error('Status load failed', e);
  }
}

async function deleteConfirmed(message, onConfirm) {
  if (!confirm(message)) return;
  await onConfirm();
}

window.addEventListener('DOMContentLoaded', () => {
  setInterval(loadNginxStatus, 15000);
  loadNginxStatus();
});

window.apiRequest = apiRequest;
window.formatDate = formatDate;
window.deleteConfirmed = deleteConfirmed;
