const rsvpForm = document.getElementById('rsvpForm');
const rsvpStatus = document.getElementById('rsvpStatus');
const welcomeText = document.getElementById('welcomeText');
const dateLegend = document.getElementById('dateLegend');
const secretSection = document.getElementById('secretSection');
const soundToggle = document.getElementById('soundToggle');
const themeToggle = document.getElementById('themeToggle');
const accessForm = document.getElementById('accessForm');
const accessStatus = document.getElementById('accessStatus');
const uploadZone = document.getElementById('uploadZone');
const uploadForm = document.getElementById('uploadForm');
const uploadStatus = document.getElementById('uploadStatus');
const uploadProgress = document.getElementById('uploadProgress');
const mediaInput = document.getElementById('mediaInput');
const gallery = document.getElementById('gallery');
const dropArea = document.getElementById('dropArea');
const filterMonth = document.getElementById('filterMonth');
const filterDay = document.getElementById('filterDay');

const guestFromQuery = new URLSearchParams(window.location.search).get('guest');
if (guestFromQuery) localStorage.setItem('guestName', guestFromQuery);
const storedName = localStorage.getItem('guestName');
if (storedName) {
  welcomeText.textContent = `Рады видеть, ${storedName}`;
}

let soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function ringBell() {
  if (!soundEnabled) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 1046;
  gain.gain.value = 0.001;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  gain.gain.exponentialRampToValueAtTime(0.15, audioCtx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.7);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.7);
}

soundToggle.textContent = soundEnabled ? '🔔 звук вкл' : '🔕 звук выкл';
soundToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem('soundEnabled', String(soundEnabled));
  soundToggle.textContent = soundEnabled ? '🔔 звук вкл' : '🔕 звук выкл';
});

themeToggle.addEventListener('click', () => {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
});
if (localStorage.getItem('theme') === 'dark') document.documentElement.classList.add('dark');

rsvpForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(rsvpForm).entries());
  try {
    const response = await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Ошибка отправки');
    rsvpStatus.textContent = 'Спасибо! Ответ получен.';
    localStorage.setItem('guestName', data.name);
    welcomeText.textContent = `Рады видеть, ${data.name}`;
    rsvpForm.reset();
  } catch (error) {
    rsvpStatus.textContent = error.message;
  }
});

dateLegend.addEventListener('mouseenter', () => {
  dateLegend.title = 'Говорят, июльская свадьба приносит в дом гармонию и тепло.';
});
dateLegend.addEventListener('click', () => {
  alert('Мини-легенда: Июль — месяц солнца. Пусть любовь будет такой же ясной и тёплой.');
});

const openedFaq = JSON.parse(localStorage.getItem('openedFaq') || '[]');
document.querySelectorAll('.acc-btn').forEach((btn, index) => {
  const panel = btn.nextElementSibling;
  if (openedFaq.includes(index)) panel.style.maxHeight = `${panel.scrollHeight + 12}px`;
  btn.addEventListener('click', () => {
    const isOpen = panel.style.maxHeight;
    panel.style.maxHeight = isOpen ? null : `${panel.scrollHeight + 12}px`;
    const updated = JSON.parse(localStorage.getItem('openedFaq') || '[]');
    const set = new Set(updated);
    if (isOpen) set.delete(index); else set.add(index);
    localStorage.setItem('openedFaq', JSON.stringify([...set]));
  });
});

let ornamentTapCount = 0;
let ornamentTapTimer;
document.getElementById('hero').addEventListener('click', () => {
  ornamentTapCount += 1;
  clearTimeout(ornamentTapTimer);
  ornamentTapTimer = setTimeout(() => {
    ornamentTapCount = 0;
  }, 900);
  if (ornamentTapCount >= 3) {
    secretSection.hidden = false;
    secretSection.scrollIntoView({ behavior: 'smooth' });
    ringBell();
    ornamentTapCount = 0;
  }
});

const combo = ['ф', 'о', 'л', 'к'];
let comboIndex = 0;
document.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === combo[comboIndex]) {
    comboIndex += 1;
    if (comboIndex === combo.length) {
      comboIndex = 0;
      secretSection.hidden = false;
      ringBell();
    }
  } else {
    comboIndex = 0;
  }
});

const foundSymbols = new Set();
document.querySelectorAll('.symbol').forEach((symbol) => {
  symbol.addEventListener('click', () => {
    foundSymbols.add(symbol.dataset.symbol);
    symbol.disabled = true;
    document.getElementById('gameStatus').textContent = `Собрано ${foundSymbols.size}/3`;
    if (foundSymbols.size === 3) {
      document.getElementById('gameStatus').textContent = 'Тост: "За любовь, что объединяет сердца и поколения!"';
      secretSection.hidden = false;
      ringBell();
    }
  });
});

accessForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const code = accessForm.code.value.trim();
  const response = await fetch('/api/upload/access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const data = await response.json();
  if (!response.ok) {
    accessStatus.textContent = data.error || 'Ошибка';
    return;
  }
  accessStatus.textContent = 'Доступ открыт.';
  uploadZone.hidden = false;
  await loadGallery();
});

async function loadGallery() {
  const query = new URLSearchParams();
  if (filterMonth.value.trim()) query.set('month', filterMonth.value.trim());
  if (filterDay.value.trim()) query.set('day', filterDay.value.trim());
  const response = await fetch(`/api/upload/media?${query.toString()}`);
  if (!response.ok) return;
  const data = await response.json();
  gallery.innerHTML = '';
  data.items.forEach((item) => {
    const el = document.createElement('a');
    el.href = `/${item.relative_path}`;
    el.target = '_blank';
    if (item.mime.startsWith('video')) {
      el.innerHTML = `<video src="/${item.relative_path}" muted></video><span>${item.original_name}</span>`;
    } else {
      const thumb = item.preview_path || item.relative_path;
      el.innerHTML = `<img src="/${thumb}" alt="${item.original_name}" /><span>${item.original_name}</span>`;
    }
    gallery.appendChild(el);
  });
}

document.getElementById('applyFilter').addEventListener('click', loadGallery);

['dragenter', 'dragover'].forEach((evt) => dropArea.addEventListener(evt, (e) => {
  e.preventDefault();
  dropArea.style.borderColor = 'var(--accent)';
}));
['dragleave', 'drop'].forEach((evt) => dropArea.addEventListener(evt, (e) => {
  e.preventDefault();
  dropArea.style.borderColor = 'var(--line)';
}));
dropArea.addEventListener('drop', (e) => {
  mediaInput.files = e.dataTransfer.files;
});

uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(uploadForm);
  uploadProgress.value = 5;
  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/upload/files');
  xhr.upload.onprogress = (e) => {
    if (!e.lengthComputable) return;
    uploadProgress.value = Math.round((e.loaded / e.total) * 100);
  };
  xhr.onload = async () => {
    const result = JSON.parse(xhr.responseText || '{}');
    if (xhr.status >= 400) {
      uploadStatus.textContent = result.error || 'Ошибка загрузки';
      return;
    }
    uploadStatus.textContent = 'Файлы загружены. Спасибо!';
    uploadProgress.value = 100;
    await loadGallery();
  };
  xhr.onerror = () => {
    uploadStatus.textContent = 'Ошибка сети при загрузке.';
  };
  xhr.send(formData);
});
