/**
 * High Springs Pediatrics & Primary Care
 * Clinical Receptionist Dashboard — frontend
 */

let allCalls = [];
let currentTab = 'all';
let currentSearch = '';

const $ = (id) => document.getElementById(id);

const callsList     = $('calls-list');
const loadingState  = $('loading-state');
const emptyState    = $('empty-state');
const errorState    = $('error-state');
const errorDetail   = $('error-detail');
const btnRefresh    = $('btn-refresh');
const searchInput   = $('search-input');
const searchClear   = $('search-clear');
const tabButtons    = document.querySelectorAll('.tab-btn');
const themeToggle   = $('theme-toggle');

const stats = {
  total:       $('stat-total-calls'),
  appointments:$('stat-appointments'),
  refills:     $('stat-refills'),
  messages:    $('stat-messages'),
  transfers:   $('stat-transfers'),
  avgDuration: $('stat-avg-duration'),
};

const counts = {
  all:          $('tab-count-all'),
  appointments: $('tab-count-appointments'),
  refills:      $('tab-count-refills'),
  messages:     $('tab-count-messages'),
  transfers:    $('tab-count-transfers'),
};

const modal = {
  root:       $('call-modal'),
  close:      $('modal-close'),
  title:      $('modal-title'),
  badge:      $('modal-category-badge'),
  caller:     $('modal-caller'),
  time:       $('modal-time'),
  duration:   $('modal-duration'),
  assistant:  $('modal-assistant'),
  actionBox:  $('modal-action-box'),
  transcript: $('modal-transcript'),
  audioWrap:  $('modal-audio-section'),
  audio:      $('modal-audio-player'),
};

/* ---------- Theme ---------- */
(function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem('hsp-theme'); } catch (_) {}
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', saved || (prefersDark ? 'dark' : 'light'));
})();

themeToggle.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('hsp-theme', next); } catch (_) {}
});

/* ---------- Helpers ---------- */
function escapeHtml(text) {
  return (text || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function fmtDuration(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function fmtDateShort(iso) {
  if (!iso) return 'Just now';
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function show(el, visible) { el.hidden = !visible; }

/* ---------- Data ---------- */
async function loadCalls(isManual = false) {
  if (isManual) btnRefresh.classList.add('spinning');
  try {
    const res = await fetch('/api/calls');
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    allCalls = Array.isArray(data.calls) ? data.calls : [];
    show(errorState, false);
    updateStats(data.stats || {});
    renderCalls();
  } catch (err) {
    console.error('Error loading calls:', err);
    if (allCalls.length === 0) {
      show(errorState, true);
      show(emptyState, false);
      callsList.innerHTML = '';
      errorDetail.innerHTML = `${escapeHtml(err.message)} — check that <code>VAPI_API_KEY</code> is set, then hit “Sync calls”.`;
    }
  } finally {
    show(loadingState, false);
    if (isManual) setTimeout(() => btnRefresh.classList.remove('spinning'), 500);
  }
}

function countBy(pred) { return allCalls.filter(pred).length; }
const isAppointment = (c) => c.category === 'Appointment Booking';
const isRefill      = (c) => c.category === 'Medication Refill';
const isMessage     = (c) => c.category === 'Office Message';
const isTransfer    = (c) => c.wasTransferred;

function updateStats(s) {
  stats.total.textContent        = s.totalCalls        ?? allCalls.length;
  stats.appointments.textContent = s.appointmentsCount ?? countBy(isAppointment);
  stats.refills.textContent      = s.refillsCount      ?? countBy(isRefill);
  stats.messages.textContent     = s.messagesCount     ?? countBy(isMessage);
  stats.transfers.textContent    = s.transfersCount    ?? countBy(isTransfer);
  stats.avgDuration.textContent  = fmtDuration(s.avgDurationSeconds ?? 0);

  counts.all.textContent          = allCalls.length;
  counts.appointments.textContent = countBy(isAppointment);
  counts.refills.textContent      = countBy(isRefill);
  counts.messages.textContent     = countBy(isMessage);
  counts.transfers.textContent    = countBy(isTransfer);
}

/* ---------- Render ---------- */
function matchesSearch(call, q) {
  if (!q) return true;
  const d = call.extractedData || {};
  return [
    call.callerNumber, call.transcript, call.category,
    d.patientName, d.medication, d.physician, d.confirmationNumber,
  ].some((v) => (v || '').toString().toLowerCase().includes(q));
}

function actionSnippet(call) {
  const d = call.extractedData || {};
  if (isAppointment(call)) return `📅 <strong>${escapeHtml(d.physician || 'Dr. Nasir Ahmed, M.D.')}</strong> &bull; Conf #${escapeHtml(d.confirmationNumber || 'logged')}`;
  if (isRefill(call))      return `💊 Refill: <strong>${escapeHtml(d.medication || 'medication')}</strong> &bull; triage queue`;
  if (isMessage(call))     return `📬 Message for clinic staff`;
  if (isTransfer(call))    return `🔀 Transferred to office (+1 352-231-9154)`;
  return `📞 General practice inquiry`;
}

function renderCalls() {
  const q = currentSearch.trim().toLowerCase();
  const filtered = allCalls.filter((call) => {
    if (currentTab === 'appointments' && !isAppointment(call)) return false;
    if (currentTab === 'refills' && !isRefill(call)) return false;
    if (currentTab === 'messages' && !isMessage(call)) return false;
    if (currentTab === 'transfers' && !isTransfer(call)) return false;
    return matchesSearch(call, q);
  });

  callsList.innerHTML = '';

  if (filtered.length === 0) {
    show(emptyState, !errorState.hidden ? false : true);
    return;
  }
  show(emptyState, false);

  const frag = document.createDocumentFragment();
  filtered.forEach((call) => {
    const snippet = (call.transcript || '').slice(0, 220);
    const card = document.createElement('article');
    card.className = 'call-card';
    card.addEventListener('click', () => openModal(call));
    card.innerHTML = `
      <div class="call-card-top">
        <div class="call-meta-left">
          <span class="badge badge-${call.categoryColor}">${call.categoryIcon} ${escapeHtml(call.category)}</span>
          <span class="call-caller">${escapeHtml(call.callerNumber)}</span>
          <span class="call-time">${fmtDateShort(call.startedAt)}</span>
        </div>
        <span class="call-duration">${fmtDuration(call.durationSeconds)}</span>
      </div>
      <p class="call-snippet">${escapeHtml(snippet)}${(call.transcript || '').length > 220 ? '…' : ''}</p>
      <div class="call-card-bottom">
        <span class="call-action-pill">${actionSnippet(call)}</span>
        <div class="call-card-meta">
          <span>Receptionist: <strong>${escapeHtml(call.assistantName || 'Riley')}</strong></span>
          ${call.recordingUrl ? '<span class="call-has-audio">🎧 Audio</span>' : ''}
        </div>
      </div>`;
    frag.appendChild(card);
  });
  callsList.appendChild(frag);
}

/* ---------- Modal ---------- */
function openModal(call) {
  const d = call.extractedData || {};
  modal.title.textContent = `Call from ${call.callerNumber}`;
  modal.badge.className = `badge badge-${call.categoryColor}`;
  modal.badge.textContent = `${call.categoryIcon} ${call.category}`;
  modal.caller.textContent = call.callerNumber;
  modal.time.textContent = call.startedAt ? new Date(call.startedAt).toLocaleString() : 'N/A';
  modal.duration.textContent = fmtDuration(call.durationSeconds);
  modal.assistant.textContent = `${call.assistantName || 'Riley'} (Voice AI)`;

  if (isAppointment(call)) {
    show(modal.actionBox, true);
    modal.actionBox.innerHTML =
      `<strong>📅 Appointment</strong><br>` +
      `Physician: <strong>${escapeHtml(d.physician || 'Dr. Nasir Ahmed, M.D.')}</strong><br>` +
      `Patient: <strong>${escapeHtml(d.patientName || '—')}</strong><br>` +
      `Confirmation: <span class="chip">#${escapeHtml(d.confirmationNumber || '—')}</span><br>` +
      `Slot: ${escapeHtml(d.timeSlot || 'confirmed time')}`;
  } else if (isRefill(call)) {
    show(modal.actionBox, true);
    modal.actionBox.innerHTML =
      `<strong>💊 Prescription refill</strong><br>` +
      `Medication: <strong>${escapeHtml(d.medication || '—')}</strong><br>` +
      `Patient: <strong>${escapeHtml(d.patientName || '—')}</strong><br>` +
      `Routing: <strong>nursing triage</strong> (24–48h)`;
  } else if (isTransfer(call)) {
    show(modal.actionBox, true);
    modal.actionBox.innerHTML =
      `<strong>🔀 Live transfer</strong><br>` +
      `Caller was forwarded to the office desk line: <strong>+1 (352) 231-9154</strong>`;
  } else {
    show(modal.actionBox, false);
  }

  if (call.recordingUrl) {
    show(modal.audioWrap, true);
    modal.audio.src = call.recordingUrl;
  } else {
    show(modal.audioWrap, false);
    modal.audio.pause();
    modal.audio.removeAttribute('src');
  }

  modal.transcript.innerHTML = formatTranscript(call.transcript);
  modal.root.hidden = false;
  modal.root.classList.add('is-open');
}

function closeModal() {
  modal.root.classList.remove('is-open');
  modal.root.hidden = true;
  modal.audio.pause();
  modal.audio.removeAttribute('src');
}

function formatTranscript(raw) {
  if (!raw) return '<em>No transcript recorded.</em>';
  return escapeHtml(raw)
    .replace(/(AI:|Assistant:)/g, '<span class="transcript-line-ai">🤖 Riley:</span>')
    .replace(/(User:|Customer:)/g, '<span class="transcript-line-user">👤 Caller:</span>');
}

/* ---------- Events ---------- */
btnRefresh.addEventListener('click', () => loadCalls(true));

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentTab = btn.dataset.tab;
    renderCalls();
  });
});

searchInput.addEventListener('input', (e) => {
  currentSearch = e.target.value;
  show(searchClear, currentSearch.length > 0);
  renderCalls();
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  currentSearch = '';
  show(searchClear, false);
  renderCalls();
  searchInput.focus();
});

modal.close.addEventListener('click', closeModal);
modal.root.addEventListener('click', (e) => { if (e.target === modal.root) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

/* ---------- Boot ---------- */
loadCalls(false);
setInterval(() => loadCalls(false), 15000);
