/* global webkitSpeechRecognition, SpeechRecognition */
const state = {
  locale: 'fr-FR',
  dictionaries: {},
  theme: 'light',
  recognition: null,
  recognizing: false,
  transcript: [],
  markers: [],
  interim: '',
  sessionId: null
};

const selectors = {
  themeToggle: document.getElementById('theme-toggle'),
  langSelect: document.getElementById('lang-select'),
  recordBtn: document.getElementById('record-btn'),
  importBtn: document.getElementById('import-btn'),
  transcriptionStream: document.getElementById('transcription-stream'),
  downloadBtn: document.getElementById('download-transcript'),
  cleanBtn: document.getElementById('clean-transcript'),
  saveBtn: document.getElementById('save-session'),
  importDialog: document.getElementById('import-dialog'),
  importForm: document.getElementById('import-form'),
  aiDialog: document.getElementById('ai-dialog')
};

function bootstrap() {
  loadTheme();
  loadLocale();
  bindUI();
  registerServiceWorker();
  createSessionDraft();
}

document.addEventListener('DOMContentLoaded', bootstrap);

function bindUI() {
  selectors.themeToggle?.addEventListener('click', toggleTheme);
  selectors.langSelect?.addEventListener('change', onLanguageChange);
  selectors.recordBtn?.addEventListener('click', toggleRecording);
  selectors.downloadBtn?.addEventListener('click', downloadTranscript);
  selectors.cleanBtn?.addEventListener('click', cleanTranscript);
  selectors.saveBtn?.addEventListener('click', saveSession);
  selectors.importBtn?.addEventListener('click', () => selectors.importDialog.showModal());
  selectors.importDialog?.addEventListener('click', (event) => {
    if (event.target.hasAttribute('data-close')) {
      selectors.importDialog.close();
    }
  });
  selectors.aiDialog?.addEventListener('click', (event) => {
    if (event.target.hasAttribute('data-close')) {
      selectors.aiDialog.close();
    }
  });
  selectors.importForm?.addEventListener('submit', handleAudioImport);
  document.addEventListener('keydown', handleMarkerShortcut);
}

async function loadLocale() {
  try {
    const response = await fetch('/api/i18n/bootstrap');
    const payload = await response.json();
    state.locale = payload.locale;
    state.dictionaries = payload.dictionaries;
    selectors.langSelect.value = state.locale;
    applyLocale();
  } catch (error) {
    console.error('Failed to load locale', error);
  }
}

function applyLocale() {
  const dict = state.dictionaries[state.locale] || {};
  const mapping = [
    ['app-title', dict.appName],
    ['record-btn', dict.record],
    ['import-btn', dict.import]
  ];
  mapping.forEach(([id, value]) => {
    if (value && document.getElementById(id)) {
      document.getElementById(id).textContent = value;
    }
  });
  document.documentElement.lang = state.locale.slice(0, 2);
}

function onLanguageChange(event) {
  state.locale = event.target.value;
  applyLocale();
}

function loadTheme() {
  const stored = localStorage.getItem('assistant-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  state.theme = stored || (prefersDark ? 'dark' : 'light');
  document.documentElement.dataset.theme = state.theme;
  if (selectors.themeToggle) {
    selectors.themeToggle.setAttribute('aria-checked', state.theme === 'dark');
    selectors.themeToggle.querySelector('.theme-toggle__label').textContent = state.theme === 'dark' ? 'Mode sombre' : 'Mode clair';
  }
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = state.theme;
  localStorage.setItem('assistant-theme', state.theme);
  if (selectors.themeToggle) {
    selectors.themeToggle.setAttribute('aria-checked', state.theme === 'dark');
    selectors.themeToggle.querySelector('.theme-toggle__label').textContent = state.theme === 'dark' ? 'Mode sombre' : 'Mode clair';
  }
}

async function toggleRecording() {
  if (state.recognizing) {
    stopRecognition();
    return;
  }
  try {
    const recognition = createRecognition();
    if (!recognition) {
      simulateRecognition();
      return;
    }
    state.recognition = recognition;
    recognition.start();
    state.recognizing = true;
    selectors.recordBtn.classList.add('pulse-3');
  } catch (error) {
    console.error('Unable to start recognition', error);
    simulateRecognition();
  }
}

function stopRecognition() {
  if (state.recognition && state.recognizing) {
    state.recognition.stop();
  }
  state.recognizing = false;
  selectors.recordBtn.classList.remove('pulse-3');
}

function createRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    return null;
  }
  const recognition = new Recognition();
  recognition.lang = state.locale;
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.onresult = handleRecognitionResult;
  recognition.onend = () => {
    state.recognizing = false;
    selectors.recordBtn.classList.remove('pulse-3');
  };
  recognition.onerror = (event) => {
    console.error('Recognition error', event);
    simulateRecognition();
  };
  return recognition;
}

function handleRecognitionResult(event) {
  for (let i = event.resultIndex; i < event.results.length; i += 1) {
    const result = event.results[i];
    if (result.isFinal) {
      const text = result[0].transcript.trim();
      pushTranscriptLine(text, true);
    } else {
      state.interim = result[0].transcript.trim();
      renderInterim();
    }
  }
}

function renderInterim() {
  const existing = selectors.transcriptionStream.querySelector('.transcription-line--interim');
  if (!state.interim) {
    existing?.remove();
    return;
  }
  if (existing) {
    existing.querySelector('.content').textContent = state.interim;
    return;
  }
  const line = document.createElement('p');
  line.className = 'transcription-line transcription-line--interim';
  line.dataset.time = currentTimestamp();
  const timestamp = document.createElement('span');
  timestamp.className = 'timestamp';
  timestamp.textContent = `[${line.dataset.time}]`;
  const content = document.createElement('span');
  content.className = 'content';
  content.textContent = state.interim;
  line.append(timestamp, content);
  selectors.transcriptionStream.append(line);
  selectors.transcriptionStream.scrollTo({ top: selectors.transcriptionStream.scrollHeight, behavior: 'smooth' });
}

function pushTranscriptLine(text, final = false) {
  if (!text) return;
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const entry = { time: currentTimestamp(), text: cleaned, final };
  state.transcript.push(entry);
  const line = document.createElement('p');
  line.className = 'transcription-line';
  line.dataset.time = entry.time;
  const timestamp = document.createElement('span');
  timestamp.className = 'timestamp';
  timestamp.textContent = `[${entry.time}]`;
  const content = document.createElement('span');
  content.className = 'content';
  content.textContent = cleaned;
  line.append(timestamp, content);
  selectors.transcriptionStream.append(line);
  selectors.transcriptionStream.scrollTo({ top: selectors.transcriptionStream.scrollHeight, behavior: 'smooth' });
}

function currentTimestamp() {
  const now = new Date();
  return new Intl.DateTimeFormat(state.locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now);
}

function simulateRecognition() {
  stopRecognition();
  const samples = [
    'Simulation de transcription pour test hors ligne.',
    'L\'algorithme détecte les temps forts et les résume automatiquement.',
    'Ajoutez des marqueurs pour surligner définitions, exemples et preuves.'
  ];
  samples.forEach((text, index) => {
    setTimeout(() => pushTranscriptLine(text, true), 1200 * (index + 1));
  });
}

function downloadTranscript() {
  const blob = new Blob([state.transcript.map((line) => `[${line.time}] ${line.text}`).join('\n')], { type: 'text/plain' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = `transcription-${Date.now()}.txt`;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

function cleanTranscript() {
  const before = state.transcript.length;
  state.transcript = state.transcript.filter((line) => {
    if (line.text.split(' ').length < 5 && !/[.!?]$/.test(line.text)) {
      return /(définition|théorème|exemple|preuve|important)/i.test(line.text);
    }
    return true;
  });
  if (state.transcript.length !== before) {
    renderTranscript();
  }
}

function renderTranscript() {
  selectors.transcriptionStream.innerHTML = '';
  state.transcript.forEach((entry) => {
    const line = document.createElement('p');
    line.className = 'transcription-line';
    line.dataset.time = entry.time;
    const timestamp = document.createElement('span');
    timestamp.className = 'timestamp';
    timestamp.textContent = `[${entry.time}]`;
    const content = document.createElement('span');
    content.className = 'content';
    content.textContent = entry.text;
    line.append(timestamp, content);
    selectors.transcriptionStream.append(line);
  });
}

function handleMarkerShortcut(event) {
  if (event.key.toLowerCase() === 'm') {
    const labels = ['Définition', 'Exemple', 'Théorème', 'Important'];
    const label = labels[state.markers.length % labels.length];
    const markerEntry = { time: currentTimestamp(), label };
    state.markers.push(markerEntry);
    pushTranscriptLine(`⚑ ${label}`, true);
  }
}

async function handleAudioImport(event) {
  event.preventDefault();
  const fileInput = selectors.importForm.querySelector('#audio-file');
  if (!fileInput.files.length) return;
  const formData = new FormData();
  formData.append('audio', fileInput.files[0]);
  if (state.sessionId) {
    formData.append('sessionId', state.sessionId);
  }
  try {
    const response = await fetch('/api/uploads/audio', {
      method: 'POST',
      body: formData
    });
    const payload = await response.json();
    if (payload.text) {
      pushTranscriptLine(payload.text, true);
    }
    selectors.importDialog.close();
  } catch (error) {
    console.error('Import failed', error);
  }
}

function createSessionDraft() {
  fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Session instantanée', sectionId: 'sec-maths' })
  })
    .then((response) => response.json())
    .then((session) => {
      state.sessionId = session.id;
    })
    .catch((error) => console.error('Failed to create session', error));
}

async function saveSession() {
  if (!state.sessionId) return;
  const content = state.transcript.map((line) => `[${line.time}] ${line.text}`).join('\n');
  try {
    await fetch('/api/transcripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: state.sessionId, content })
    });
    await fetch(`/api/sessions/${state.sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markers: state.markers, status: 'saved' })
    });
    selectors.aiDialog.showModal();
    await generateAiArtifacts();
  } catch (error) {
    console.error('Save session failed', error);
  }
}

async function generateAiArtifacts() {
  if (!state.sessionId) return;
  const text = state.transcript.map((line) => line.text).join(' ');
  try {
    await Promise.all([
      fetch('/api/summaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: state.sessionId, text, level: 'global' })
      }),
      fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: state.sessionId, text, n: 5 })
      }),
      fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: state.sessionId, text, strategy: 'leitner' })
      })
    ]);
  } catch (error) {
    console.error('AI artifact generation failed', error);
  }
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((error) => console.error('SW registration failed', error));
  }
}
