// Sight Word Cards — flash cards for early readers.
// 1. A word shows on the card. Your kid tries to read it out loud.
// 2. Tap the word (the white part of the card) to hear it read.
// 3. Tap the colored edge of the card for a new card.

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
  'white', 'who', 'will', 'with', 'yes'];
// Put the words from his teacher's list here, e.g. ['the', 'mom', 'dad'].
// A "My Words" button shows up on the start screen once this list has words in it.
const MY_WORDS = [];

const DECKS = [
  { name: 'Starter',   note: STARTER.length + ' words', words: STARTER, color: '#66BB6A' },
  { name: 'Next Up',   note: NEXT_UP.length + ' words', words: NEXT_UP, color: '#42A5F5' },
  { name: 'All Words', note: (STARTER.length + NEXT_UP.length) + ' words', words: [...STARTER, ...NEXT_UP], color: '#AB47BC' },
  { name: 'My Words',  note: MY_WORDS.length + ' words', words: MY_WORDS, color: '#FF7043' },
].filter(d => d.words.length > 0);

// Colors for the card edge. It changes with every new card.
const EDGE_COLORS = ['#FF7043', '#42A5F5', '#66BB6A', '#AB47BC', '#FFA726', '#EC407A', '#26A69A'];

// ---------- Page elements ----------
const cardEl = document.getElementById('card');
const faceEl = document.getElementById('face');
const wordEl = document.getElementById('word');
const countEl = document.getElementById('count');
const calloutEl = document.getElementById('callout');
const startEl = document.getElementById('start');
const decksEl = document.getElementById('decks');
const soundBtn = document.getElementById('soundBtn');
const homeBtn = document.getElementById('homeBtn');

// ---------- Settings (remembered between visits when possible) ----------
function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v === 'true'; }
  catch { return fallback; }
}
function save(key, value) { try { localStorage.setItem(key, value); } catch {} }

let soundOn = load('soundOn', true);
function refreshButtons() {
  soundBtn.classList.toggle('off', !soundOn);
  soundBtn.textContent = soundOn ? '🔊' : '🔇';
}
refreshButtons();

// ---------- Deck ----------
let deck = [];        // words left in this round, shuffled
let words = [];       // the full word list being practiced
let current = '';
let count = 0;        // cards seen
let edgeIndex = 0;
let busy = false;     // true while a card is flying, so double taps don't skip cards

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function nextWord() {
  if (deck.length === 0) {
    deck = shuffle(words);
    // Don't show the same word twice in a row when the deck restarts.
    if (deck.length > 1 && deck[deck.length - 1] === current) deck.unshift(deck.pop());
  }
  return deck.pop();
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

function showWord(word) {
  current = word;
  wordEl.textContent = word;
  wordEl.classList.remove('heard');
  cardEl.style.setProperty('--edge', EDGE_COLORS[edgeIndex % EDGE_COLORS.length]);
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
function whoosh() { tone(300, 900, 0.18, 0.15, 'triangle'); }
function cheerSound() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, f * 2, 0.25, 0.3), i * 110));
}

// ---------- Voice ----------
// The voice always reads the word — that's the point of the game.
// Only the beeps and whooshes are turned off by the sound button.
let voice = null;
function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const voices = speechSynthesis.getVoices();
  voice = voices.find(v => v.lang === 'en-US' && v.localService) ||
          voices.find(v => v.lang === 'en-US') ||
          voices.find(v => v.lang && v.lang.startsWith('en')) || null;
}
if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

function say(text, rate = 0.8) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.lang = 'en-US';
  u.rate = rate;      // a little slow so it's easy to hear
  u.pitch = 1.1;
  speechSynthesis.speak(u);
}

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
  say(current);
}

function newCard() {
  if (busy) return;
  busy = true;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  whoosh();
  cardEl.classList.add('out');
  setTimeout(() => {
    edgeIndex++;
    count++;
    countEl.textContent = '⭐ ' + count;
    const finishedRound = deck.length === 0;
    showWord(nextWord());
    cardEl.classList.remove('out');
    cardEl.classList.add('in');
    setTimeout(() => { cardEl.classList.remove('in'); busy = false; }, 330);

    if (finishedRound) {
      callout('🎉 All done!');
      say('You did every card! Great job!', 0.95);
      cheerSound();
    } else if (count % 10 === 0) {
      callout('🎉 ' + count + '!');
      say(count + ' cards! Great job!', 0.95);
      cheerSound();
    }
  }, 280);
}

cardEl.addEventListener('click', e => {
  ensureAudio();
  if (faceEl.contains(e.target)) hearWord();   // white middle = hear the word
  else newCard();                              // colored edge = new card
});

// ---------- Start screen ----------
function startDeck(d) {
  ensureAudio();
  words = d.words;
  deck = shuffle(words);
  count = 0;
  countEl.textContent = '⭐ 0';
  startEl.classList.add('hidden');
  showWord(nextWord());
  cardEl.classList.add('in');
  setTimeout(() => cardEl.classList.remove('in'), 330);
}

DECKS.forEach(d => {
  const b = document.createElement('button');
  b.style.setProperty('--c', d.color);
  b.innerHTML = `${d.name}<small>${d.note}</small>`;
  b.addEventListener('click', () => startDeck(d));
  decksEl.appendChild(b);
});

homeBtn.addEventListener('click', () => {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  startEl.classList.remove('hidden');
});
soundBtn.addEventListener('click', () => {
  soundOn = !soundOn; save('soundOn', soundOn); refreshButtons();
});
