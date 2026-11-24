// Fun Cards — flash cards for early readers.
// 1. A word shows on the card. Your kid tries to read it out loud.
// 2. Tap the word (the white part of the card) to hear it read.
// 3. Tap the right edge of the card to go forward, the left edge to go back.
// 4. After the last card, there's a big celebration.

// ---------- Word lists (edit these!) ----------
// Dolch sight words, the lists most US schools use for Pre-K and Kindergarten.
const STARTER = ['a', 'and', 'away', 'big', 'blue', 'can', 'come', 'down', 'find', 'for',
  'funny', 'go', 'help', 'here', 'I', 'in', 'is', 'it', 'jump', 'little', 'look', 'make',
  'me', 'my', 'not', 'one', 'play', 'red', 'run', 'said', 'see', 'the', 'three', 'to', 'two',
  'up', 'we', 'where', 'yellow', 'you'];
const NEXT_UP = ['all', 'am', 'are', 'at', 'ate', 'be', 'black', 'brown', 'but', 'came', 'did',
  'do', 'eat', 'four', 'get', 'good', 'have', 'he', 'into', 'like', 'must', 'new', 'no', 'now',
  'on', 'our', 'out', 'please', 'pretty', 'ran', 'ride', 'saw', 'say', 'she', 'so', 'soon',
  'that', 'there', 'they', 'this', 'too', 'under', 'want', 'was', 'well', 'went', 'what',
  'white', 'who', 'will', 'with', 'yes',
  // 8 very common words from the Dolch First Grade list, to make an even 100 in All Words.
  'of', 'from', 'his', 'her', 'had', 'some', 'them', 'then'];
// Put the words from his teacher's list here, e.g. ['the', 'mom', 'dad'].
// A "My Words" button shows up on the start screen once this list has words in it.
const MY_WORDS = [];

// Some words get misread by phone voices. Left side: the word on the card.
// Right side: what we actually ask the voice to say.
const SAY_AS = {
  'I': 'eye',     // otherwise some voices say "capital I"
};

const DECKS = [
  { name: 'Starter',   words: STARTER, color: '#66BB6A' },
  { name: 'Next Up',   words: NEXT_UP, color: '#42A5F5' },
  { name: 'All Words', words: [...STARTER, ...NEXT_UP], color: '#AB47BC' },
  { name: 'My Words',  words: MY_WORDS, color: '#FF7043' },
].filter(d => d.words.length > 0);

// Colors for the card edge. Each card keeps its own color, even when you go back.
const EDGE_COLORS = ['#FF7043', '#42A5F5', '#66BB6A', '#AB47BC', '#FFA726', '#EC407A', '#26A69A'];

// ---------- Page elements ----------
const $ = id => document.getElementById(id);
const cardEl = $('card'), faceEl = $('face'), wordEl = $('word');
const countEl = $('count'), calloutEl = $('callout');
const startEl = $('start'), decksEl = $('decks');
const finishEl = $('finish'), finishText = $('finishText');
const soundBtn = $('soundBtn'), homeBtn = $('homeBtn');
const voicePick = $('voicePick'), voiceNameEl = $('voiceName');

// ---------- Settings (remembered between visits when possible) ----------
function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v; }
  catch { return fallback; }
}
function save(key, value) { try { localStorage.setItem(key, value); } catch {} }

let soundOn = load('soundOn', 'true') === 'true';
function refreshButtons() {
  soundBtn.classList.toggle('off', !soundOn);
  soundBtn.textContent = soundOn ? '🔊' : '🔇';
}
refreshButtons();

// ---------- Deck ----------
let deckInfo = null;  // which deck is being played
let order = [];       // the shuffled cards, set once when a deck is picked
let index = 0;        // which card is showing
let furthest = 0;     // furthest card reached (for the every-10 celebrations)
let busy = false;     // true while a card is flying, so double taps don't skip cards

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Make the word as big as possible while still fitting on the card.
function fitWord() {
  const w = faceEl.clientWidth, h = faceEl.clientHeight;
  if (!w || !h) return;
  let size = h * 0.62;
  wordEl.style.fontSize = size + 'px';
  const maxW = w * 0.88;
  if (wordEl.scrollWidth > maxW) size *= maxW / wordEl.scrollWidth;
  wordEl.style.fontSize = size + 'px';
}
window.addEventListener('resize', fitWord);
if (document.fonts) document.fonts.ready.then(fitWord);

function showCard() {
  wordEl.textContent = order[index];
  wordEl.classList.remove('heard');
  cardEl.style.setProperty('--edge', EDGE_COLORS[index % EDGE_COLORS.length]);
  countEl.textContent = `⭐ ${index + 1} / ${order.length}`;
  fitWord();
}

// ---------- Sound (made in code, no audio files needed) ----------
let audio = null;
function ensureAudio() {
  if (!audio) {
    try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  }
  if (audio && audio.state === 'suspended') audio.resume();
}
function tone(freq, endFreq, len, vol = 0.25, type = 'sine') {
  if (!soundOn || !audio) return;
  const t = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(endFreq, t + len);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + len);
  osc.connect(gain).connect(audio.destination);
  osc.start(t); osc.stop(t + len + 0.02);
}
function whoosh(back) { back ? tone(900, 300, 0.18, 0.15, 'triangle') : tone(300, 900, 0.18, 0.15, 'triangle'); }
function boop() { tone(220, 160, 0.15, 0.2, 'square'); }
function cheerSound() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, f * 2, 0.25, 0.3), i * 110));
}
function fanfare() {
  [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) =>
    setTimeout(() => tone(f, f * 1.5, 0.3, 0.3), i * 140));
}

// ---------- Voice ----------
// The phone or tablet's own voices are used. Newer "Enhanced", "Premium" and
// "Natural" voices sound much more human, so those are picked first when the
// device has them. The 🗣️ button on the start screen cycles through all of
// the device's English voices, and the choice is remembered.
let voices = [];
let voice = null;

function voiceScore(v) {
  const n = v.name.toLowerCase();
  let s = 0;
  if (/premium|enhanced|natural|neural/.test(n)) s += 50;   // the realistic ones
  if (/google us english/.test(n)) s += 30;
  if (/samantha|ava|allison|susan|zoe|nicky|aria|jenny|michelle|emma|ana\b/.test(n)) s += 15; // bright female voices
  if (v.lang === 'en-US') s += 10;
  if (v.localService) s += 2;                                 // works offline
  if (/novelty|bells|bubbles|boing|whisper|zarvox|trinoids|jester|organ|cellos|bad news|good news|albert|fred|junior|ralph|superstar|wobble|grandpa|grandma|rocko|shelley|sandy|flo|eddy|reed/.test(n)) s -= 100; // joke & robot voices
  return s;
}

function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  voices = speechSynthesis.getVoices()
    .filter(v => v.lang && v.lang.replace('_', '-').startsWith('en'))
    .sort((a, b) => voiceScore(b) - voiceScore(a));
  const saved = load('voiceName', null);
  voice = voices.find(v => v.name === saved) || voices[0] || null;
  voiceNameEl.textContent = voice ? shortName(voice) : 'Voice';
  voicePick.classList.toggle('hidden', voices.length < 2);
}
function shortName(v) { return v.name.replace(/\s*\(.*?English.*?\)\s*/i, ' ').replace(/Microsoft\s*/i, '').trim(); }

if ('speechSynthesis' in window) {
  loadVoices();
  speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

function say(text, rate = 0.85, pitch = 1.15) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(SAY_AS[text] || text);
  if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = 'en-US';
  u.rate = rate;      // a little slow so it's easy to hear
  u.pitch = pitch;    // a little bright and cheerful
  speechSynthesis.speak(u);
}

voicePick.addEventListener('click', () => {
  if (!voices.length) return;
  const i = voices.indexOf(voice);
  voice = voices[(i + 1) % voices.length];
  save('voiceName', voice.name);
  voiceNameEl.textContent = shortName(voice);
  say("Hi friend! Let's read!", 0.95);
});

let calloutTimer = null;
function callout(text) {
  calloutEl.textContent = text;
  calloutEl.classList.add('show');
  clearTimeout(calloutTimer);
  calloutTimer = setTimeout(() => calloutEl.classList.remove('show'), 1100);
}

// ---------- Taps ----------
function hearWord() {
  wordEl.classList.remove('heard');
  void wordEl.offsetWidth;            // restart the bounce animation
  wordEl.classList.add('heard');
  say(order[index]);
}

function flip(step) {
  if (busy) return;
  const target = index + step;
  if (target < 0) {                   // already on the first card
    boop();
    cardEl.classList.remove('wiggle'); void cardEl.offsetWidth; cardEl.classList.add('wiggle');
    return;
  }
  if (target >= order.length) { finish(); return; }

  busy = true;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  const back = step < 0;
  whoosh(back);
  cardEl.classList.add(back ? 'back-out' : 'out');
  setTimeout(() => {
    index = target;
    showCard();
    cardEl.classList.remove('out', 'back-out');
    cardEl.classList.add(back ? 'back-in' : 'in');
    setTimeout(() => { cardEl.classList.remove('in', 'back-in'); busy = false; }, 330);

    if (index > furthest) {
      furthest = index;
      if (furthest % 10 === 0) {
        callout('🎉 ' + furthest + '!');
        say(furthest + ' cards! Great job!', 0.95);
        cheerSound();
      }
    }
  }, 280);
}

cardEl.addEventListener('click', e => {
  ensureAudio();
  if (faceEl.contains(e.target)) { hearWord(); return; }   // white middle = hear the word
  const box = cardEl.getBoundingClientRect();
  flip(e.clientX < box.left + box.width / 2 ? -1 : 1);     // left edge = back, right edge = forward
});

// Keyboard arrows too, handy on a computer.
document.addEventListener('keydown', e => {
  if (!startEl.classList.contains('hidden') || !finishEl.classList.contains('hidden')) return;
  if (e.key === 'ArrowRight') flip(1);
  else if (e.key === 'ArrowLeft') flip(-1);
  else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); hearWord(); }
});

// ---------- Finish ----------
function confetti() {
  const colors = ['#EF5350', '#FFCA28', '#66BB6A', '#42A5F5', '#AB47BC', '#EC407A', '#FFA726'];
  for (let i = 0; i < 120; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = (2.2 + Math.random() * 2.3) + 's';
    c.style.animationDelay = (Math.random() * 1.2) + 's';
    if (Math.random() < 0.4) c.style.borderRadius = '50%';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 6000);
  }
}

function finish() {
  const n = order.length;
  finishText.innerHTML = `You read all<br>${n} words!`;
  finishEl.classList.remove('hidden');
  confetti();
  setTimeout(confetti, 1500);
  fanfare();
  say(`Hooray! You read all ${n} words! Amazing job!`, 0.95, 1.2);
}

// ---------- Start screen ----------
function startDeck(d) {
  ensureAudio();
  deckInfo = d;
  order = shuffle(d.words);   // the order is set once here; back and forward follow it
  index = 0;
  furthest = 0;
  startEl.classList.add('hidden');
  finishEl.classList.add('hidden');
  showCard();
  cardEl.classList.add('in');
  setTimeout(() => cardEl.classList.remove('in'), 330);
}

DECKS.forEach(d => {
  const b = document.createElement('button');
  b.style.setProperty('--c', d.color);
  b.innerHTML = `${d.name}<small>${d.words.length} words</small>`;
  b.addEventListener('click', () => startDeck(d));
  decksEl.appendChild(b);
});

function goHome() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  finishEl.classList.add('hidden');
  startEl.classList.remove('hidden');
}
homeBtn.addEventListener('click', goHome);
$('finishHome').addEventListener('click', goHome);
$('againBtn').addEventListener('click', () => startDeck(deckInfo));
soundBtn.addEventListener('click', () => {
  soundOn = !soundOn; save('soundOn', soundOn); refreshButtons();
});
