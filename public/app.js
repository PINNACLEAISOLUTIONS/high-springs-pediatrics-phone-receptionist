/**
 * HIGH SPRINGS PEDIATRICS & PRIMARY CARE
 * Clinical Receptionist Dashboard Frontend Engine
 */

let allCalls = [];
let currentTab = 'all';
let currentSearch = '';

// DOM Elements
const callsList = document.getElementById('calls-list');
const loadingState = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');
const btnRefresh = document.getElementById('btn-refresh');
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');
const tabButtons = document.querySelectorAll('.tab-btn');

// Stats Elements
const statTotal = document.getElementById('stat-total-calls');
const statAppointments = document.getElementById('stat-appointments');
const statRefills = document.getElementById('stat-refills');
const statMessages = document.getElementById('stat-messages');
const statTransfers = document.getElementById('stat-transfers');

// Tab Counts
const countAll = document.getElementById('tab-count-all');
const countAppointments = document.getElementById('tab-count-appointments');
const countRefills = document.getElementById('tab-count-refills');
const countMessages = document.getElementById('tab-count-messages');
const countTransfers = document.getElementById('tab-count-transfers');

// Modal Elements
const callModal = document.getElementById('call-modal');
const modalClose = document.getElementById('modal-close');
const modalTitle = document.getElementById('modal-title');
const modalBadge = document.getElementById('modal-category-badge');
const modalCaller = document.getElementById('modal-caller');
const modalTime = document.getElementById('modal-time');
const modalDuration = document.getElementById('modal-duration');
const modalAssistant = document.getElementById('modal-assistant');
const modalActionBox = document.getElementById('modal-action-box');
const modalTranscript = document.getElementById('modal-transcript');
const modalAudioSection = document.getElementById('modal-audio-section');
const modalAudioPlayer = document.getElementById('modal-audio-player');

/**
 * Fetch live call records from backend API
 */
async function loadCalls(isManual = false) {
  try {
    if (isManual) {
      btnRefresh.classList.add('spinning');
    }

    const response = await fetch('/api/calls');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch calls`);
    }

    const data = await response.json();
    allCalls = Array.isArray(data.calls) ? data.calls : [];

    // Update Statistics
    updateStats(data.stats || {});

    // Render Calls
    renderCalls();

  } catch (error) {
    console.error('Error loading calls:', error);
  } finally {
    loadingState.classList.add('hidden');
    if (isManual) {
      setTimeout(() => btnRefresh.classList.remove('spinning'), 500);
    }
  }
}

/**
 * Update top-level metric counters
 */
function updateStats(stats) {
  statTotal.textContent = stats.totalCalls ?? allCalls.length;
  statAppointments.textContent = stats.appointmentsCount ?? allCalls.filter(c => c.category === 'Appointment Booking').length;
  statRefills.textContent = stats.refillsCount ?? allCalls.filter(c => c.category === 'Medication Refill').length;
  statMessages.textContent = stats.messagesCount ?? allCalls.filter(c => c.category === 'Office Message').length;
  statTransfers.textContent = stats.transfersCount ?? allCalls.filter(c => c.wasTransferred).length;

  countAll.textContent = allCalls.length;
  countAppointments.textContent = allCalls.filter(c => c.category === 'Appointment Booking').length;
  countRefills.textContent = allCalls.filter(c => c.category === 'Medication Refill').length;
  countMessages.textContent = allCalls.filter(c => c.category === 'Office Message').length;
  countTransfers.textContent = allCalls.filter(c => c.wasTransferred).length;
}

/**
 * Filter and render call list cards
 */
function renderCalls() {
  const query = currentSearch.trim().toLowerCase();

  const filtered = allCalls.filter(call => {
    // 1. Tab filtering
    if (currentTab === 'appointments' && call.category !== 'Appointment Booking') return false;
    if (currentTab === 'refills' && call.category !== 'Medication Refill') return false;
    if (currentTab === 'messages' && call.category !== 'Office Message') return false;
    if (currentTab === 'transfers' && !call.wasTransferred) return false;

    // 2. Search query filtering
    if (query) {
      const matchCaller = (call.callerNumber || '').toLowerCase().includes(query);
      const matchTranscript = (call.transcript || '').toLowerCase().includes(query);
      const matchCategory = (call.category || '').toLowerCase().includes(query);
      const matchPatient = call.extractedData && (call.extractedData.patientName || '').toLowerCase().includes(query);
      const matchMed = call.extractedData && (call.extractedData.medication || '').toLowerCase().includes(query);
      const matchDoc = call.extractedData && (call.extractedData.physician || '').toLowerCase().includes(query);
      const matchConf = call.extractedData && (call.extractedData.confirmationNumber || '').toLowerCase().includes(query);

      return matchCaller || matchTranscript || matchCategory || matchPatient || matchMed || matchDoc || matchConf;
    }

    return true;
  });

  callsList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  filtered.forEach(call => {
    const card = document.createElement('div');
    card.className = 'call-card';
    card.addEventListener('click', () => openModal(call));

    const dateFormatted = call.startedAt ? new Date(call.startedAt).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'Just now';

    let actionSnippet = '';
    if (call.category === 'Appointment Booking') {
      const doc = call.extractedData.physician || 'Dr. Nasir Ahmed, M.D.';
      const conf = call.extractedData.confirmationNumber;
      actionSnippet = `📅 <strong>${doc}</strong> &bull; Conf: #${conf || 'Logged'}`;
    } else if (call.category === 'Medication Refill') {
      actionSnippet = `💊 Refill: <strong>${call.extractedData.medication || 'Medication'}</strong> &bull; Triage Queue`;
    } else if (call.category === 'Office Message') {
      actionSnippet = `📬 Message for Clinic Staff`;
    } else if (call.wasTransferred) {
      actionSnippet = `🔀 Transferred to Office (+1 352-231-9154)`;
    } else {
      actionSnippet = `📞 General Practice Inquiry`;
    }

    card.innerHTML = `
      <div class="call-card-top">
        <div class="call-meta-left">
          <span class="badge badge-${call.categoryColor}">${call.categoryIcon} ${call.category}</span>
          <span class="call-caller">${call.callerNumber}</span>
          <span class="call-time">${dateFormatted}</span>
        </div>
        <div class="call-duration">${call.durationSeconds}s duration</div>
      </div>
      
      <p class="call-snippet">"${escapeHtml(call.transcript.substring(0, 220))}${call.transcript.length > 220 ? '...' : ''}"</p>

      <div class="call-card-bottom">
        <span class="call-action-pill">${actionSnippet}</span>
        <div style="display: flex; gap: 12px; align-items: center;">
          <span style="font-size: 12px; color: var(--text-muted);">Receptionist: <strong>${call.assistantName}</strong></span>
          ${call.recordingUrl ? '<span class="call-has-audio">🎧 Audio Available</span>' : ''}
        </div>
      </div>
    `;

    callsList.appendChild(card);
  });
}

/**
 * Open Call Details Modal with Audio & Transcript
 */
function openModal(call) {
  modalTitle.textContent = `Call from ${call.callerNumber}`;
  modalBadge.className = `badge badge-${call.categoryColor}`;
  modalBadge.textContent = `${call.categoryIcon} ${call.category}`;

  modalCaller.textContent = call.callerNumber;
  modalTime.textContent = call.startedAt ? new Date(call.startedAt).toLocaleString() : 'N/A';
  modalDuration.textContent = `${call.durationSeconds} seconds`;
  modalAssistant.textContent = `${call.assistantName} (Voice AI)`;

  // Action Box
  if (call.category === 'Appointment Booking') {
    modalActionBox.classList.remove('hidden');
    modalActionBox.innerHTML = `
      <strong>📅 Confirmed Appointment Details:</strong><br>
      • Physician: <strong>${call.extractedData.physician || 'Dr. Nasir Ahmed, M.D.'}</strong><br>
      • Patient: <strong>${call.extractedData.patientName || 'Michael Patella'}</strong><br>
      • Confirmation Code: <span style="background: rgba(139,92,246,0.3); padding: 2px 6px; border-radius: 4px; font-weight: bold;">#${call.extractedData.confirmationNumber || '481'}</span><br>
      • Scheduled Slot: ${call.extractedData.timeSlot || 'Confirmed Time'}
    `;
  } else if (call.category === 'Medication Refill') {
    modalActionBox.classList.remove('hidden');
    modalActionBox.innerHTML = `
      <strong>💊 Prescription Refill Request:</strong><br>
      • Medication: <strong>${call.extractedData.medication || 'Insulin'}</strong><br>
      • Patient: <strong>${call.extractedData.patientName || 'Emma'}</strong><br>
      • Routing: <strong>Logged for Clinical Nursing Triage</strong> (24-48h turnaround)
    `;
  } else if (call.wasTransferred) {
    modalActionBox.classList.remove('hidden');
    modalActionBox.innerHTML = `
      <strong>🔀 Live Human Escalation:</strong><br>
      • Caller requested live staff member / complex assistance.<br>
      • Call was forwarded directly to office desk line: <strong>+1 (352) 231-9154</strong>
    `;
  } else {
    modalActionBox.classList.add('hidden');
  }

  // Audio Player
  if (call.recordingUrl) {
    modalAudioSection.classList.remove('hidden');
    modalAudioPlayer.src = call.recordingUrl;
  } else {
    modalAudioSection.classList.add('hidden');
    modalAudioPlayer.pause();
    modalAudioPlayer.src = '';
  }

  // Transcript formatting
  const formattedTranscript = formatTranscript(call.transcript);
  modalTranscript.innerHTML = formattedTranscript;

  callModal.classList.remove('hidden');
}

/**
 * Close modal and pause audio
 */
function closeModal() {
  callModal.classList.add('hidden');
  modalAudioPlayer.pause();
  modalAudioPlayer.src = '';
}

/**
 * Format raw transcript text into dialogue lines
 */
function formatTranscript(raw) {
  if (!raw) return '<em>No transcript recorded.</em>';

  return raw
    .replace(/(AI:|Assistant:)(.*?)(?=(User:|AI:|Assistant:|$))/gs, '<span class="transcript-line-ai">🤖 Emma:</span>$2<br><br>')
    .replace(/(User:)(.*?)(?=(User:|AI:|Assistant:|$))/gs, '<span class="transcript-line-user">👤 Caller:</span>$2<br><br>');
}

function escapeHtml(text) {
  return (text || '')
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Event Listeners
btnRefresh.addEventListener('click', () => loadCalls(true));

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTab = btn.getAttribute('data-tab');
    renderCalls();
  });
});

searchInput.addEventListener('input', (e) => {
  currentSearch = e.target.value;
  if (currentSearch.length > 0) {
    searchClear.classList.remove('hidden');
  } else {
    searchClear.classList.add('hidden');
  }
  renderCalls();
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  currentSearch = '';
  searchClear.classList.add('hidden');
  renderCalls();
});

modalClose.addEventListener('click', closeModal);
callModal.addEventListener('click', (e) => {
  if (e.target === callModal) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// Initial Load & Auto Refresh every 15 seconds
loadCalls(false);
setInterval(() => loadCalls(false), 15000);
