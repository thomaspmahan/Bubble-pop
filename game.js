// Bubble Pop Pals — a simple tap game for little kids.
// No way to lose: bubbles float up, tap them to pop. Every pop says the color,
// and every 10 pops there's a celebration.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const calloutEl = document.getElementById('callout');
const startEl = document.getElementById('start');
const soundBtn = document.getElementById('soundBtn');
const voiceBtn = document.getElementById('voiceBtn');

// ---------- Settings (remembered between visits when possible) ----------
function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v === 'true'; }
  catch { return fallback; }
}
function save(key, value) { try { localStorage.setItem(key, value); } catch {} }

let soundOn = load('soundOn', true);
let voiceOn = load('voiceOn', true);
function refreshButtons() {
  soundBtn.classList.toggle('off', !soundOn);
  voiceBtn.classList.toggle('off', !voiceOn);
  soundBtn.textContent = soundOn ? '🔊' : '🔇';
}
refreshButtons();

// ---------- Game data ----------
const COLORS = [
  { name: 'Red',    fill: '#EF5350', note: 523 },
  { name: 'Orange', fill: '#FFA726', note: 587 },
  { name: 'Yellow', fill: '#FFEE58', note: 659 },
  { name: 'Green',  fill: '#66BB6A', note: 698 },
  { name: 'Blue',   fill: '#42A5F5', note: 784 },
  { name: 'Purple', fill: '#AB47BC', note: 880 },
  { name: 'Pink',   fill: '#F06292', note: 988 },
];
const PALS = ['🐶', '🐱', '🐸', '🐵', '🐷', '🐰', '🦁', '🐻', '🐼', '🐥', '🐢', '🐙'];

let W = 0, H = 0, DPR = 1;
let bubbles = [];
let particles = [];
let score = 0;
let running = false;
let spawnTimer = 0;
let lastTime = 0;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * DPR; canvas.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);
resize();

function rand(a, b) { return a + Math.random() * (b - a); }

function spawnBubble() {
  const r = rand(38, 62) * Math.min(1.3, Math.max(0.8, W / 500));
  bubbles.push({
    x: rand(r, W - r),
    y: H + r,
    r,
    speed: rand(45, 90),           // pixels per second — slow for little fingers
    wobble: rand(0, Math.PI * 2),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    pal: Math.random() < 0.6 ? PALS[Math.floor(Math.random() * PALS.length)] : null,
  });
}

// ---------- Sound (made in code, no audio files needed) ----------
let audio = null;
function ensureAudio() {
  if (!audio) {
    try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  }
  if (audio && audio.state === 'suspended') audio.resume();
}
function popSound(freq) {
  if (!soundOn || !audio) return;
  const t = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq * 2, t + 0.08);
  gain.gain.setValueAtTime(0.35, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  osc.connect(gain).connect(audio.destination);
  osc.start(t); osc.stop(t + 0.26);
}
function cheerSound() {
  if (!soundOn || !audio) return;
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => popSound(f), i * 110));
}

function say(text) {
  if (!voiceOn || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95; u.pitch = 1.3;
  speechSynthesis.speak(u);
}

let calloutTimer = null;
function callout(text) {
  calloutEl.textContent = text;
  calloutEl.classList.add('show');
  clearTimeout(calloutTimer);
  calloutTimer = setTimeout(() => calloutEl.classList.remove('show'), 900);
}

// ---------- Popping ----------
function burst(x, y, color, count = 14) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2), s = rand(120, 320);
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 1, size: rand(5, 11), color, star: false });
  }
}
function starShower() {
  for (let i = 0; i < 40; i++) {
    particles.push({ x: rand(0, W), y: rand(-60, 0), vx: rand(-40, 40), vy: rand(150, 350),
      life: 1.8, size: rand(18, 30), color: '#FFD54F', star: true });
  }
}

function handleTap(px, py) {
  if (!running) return;
  ensureAudio();
  // Check from the top-most (last drawn) bubble down. Hit area is a bit
  // bigger than the bubble so small fingers succeed.
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    const dx = px - b.x, dy = py - b.y;
    if (dx * dx + dy * dy <= (b.r * 1.2) ** 2) {
      bubbles.splice(i, 1);
      score++;
      scoreEl.textContent = '⭐ ' + score;
      burst(b.x, b.y, b.color.fill);
      popSound(b.color.note);
      if (score % 10 === 0) {
        callout('🎉 ' + score + '!');
        say(score + '! Great job!');
        cheerSound();
        starShower();
      } else {
        callout(b.color.name);
        say(b.color.name);
      }
      return;
    }
  }
}

canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  handleTap(e.clientX, e.clientY);
});

// ---------- Drawing ----------
function drawBubble(b) {
  const x = b.x + Math.sin(b.wobble) * 8;
  ctx.save();
  ctx.globalAlpha = 0.9;
  const g = ctx.createRadialGradient(x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.1, x, b.y, b.r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.25, b.color.fill);
  g.addColorStop(1, b.color.fill);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.stroke();
  // shine
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.beginPath(); ctx.ellipse(x - b.r * 0.4, b.y - b.r * 0.45, b.r * 0.18, b.r * 0.1, -0.6, 0, Math.PI * 2); ctx.fill();
  if (b.pal) {
    ctx.font = `${Math.round(b.r * 0.95)}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(b.pal, x, b.y + b.r * 0.05);
  }
  ctx.restore();
}

function drawStar(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + i * Math.PI / 5;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath(); ctx.fill();
}

function drawClouds(t) {
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  const clouds = [[0.15, 0.18, 1], [0.7, 0.3, 1.3], [0.4, 0.62, 0.9]];
  clouds.forEach(([cx, cy, s], i) => {
    const x = ((cx * W + t * (8 + i * 4)) % (W + 240)) - 120;
    const y = cy * H;
    ctx.beginPath();
    ctx.arc(x, y, 30 * s, 0, Math.PI * 2);
    ctx.arc(x + 32 * s, y - 14 * s, 36 * s, 0, Math.PI * 2);
    ctx.arc(x + 66 * s, y, 28 * s, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ---------- Main loop ----------
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
  lastTime = now;
  const t = now / 1000;

  ctx.clearRect(0, 0, W, H);
  drawClouds(t);

  if (running) {
    spawnTimer -= dt;
    if (spawnTimer <= 0 && bubbles.length < 12) {
      spawnBubble();
      spawnTimer = rand(0.5, 1.1);
    }
  }

  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.y -= b.speed * dt;
    b.wobble += dt * 2;
    if (b.y < -b.r * 1.5) bubbles.splice(i, 1); // floated away — no penalty
    else drawBubble(b);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (!p.star) p.vy += 400 * dt;
    p.life -= dt * (p.star ? 0.6 : 1.6);
    if (p.life <= 0 || p.y > H + 50) { particles.splice(i, 1); continue; }
    ctx.globalAlpha = Math.min(1, p.life);
    ctx.fillStyle = p.color;
    if (p.star) drawStar(p.x, p.y, p.size);
    else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---------- Buttons ----------
document.getElementById('playBtn').addEventListener('click', () => {
  ensureAudio();
  startEl.classList.add('hidden');
  running = true;
  for (let i = 0; i < 3; i++) setTimeout(spawnBubble, i * 300);
  say('Pop the bubbles!');
});
soundBtn.addEventListener('click', () => {
  soundOn = !soundOn; save('soundOn', soundOn); refreshButtons();
});
voiceBtn.addEventListener('click', () => {
  voiceOn = !voiceOn; save('voiceOn', voiceOn); refreshButtons();
  if (!voiceOn && 'speechSynthesis' in window) speechSynthesis.cancel();
});
