# Fun Cards

Flash cards for practicing sight words, built as a Progressive Web App (PWA).

- A word shows on the card. Your kid tries to read it out loud.
- Tap the word (the white part of the card) to hear it read.
- Tap the right edge of the card to go forward, the left edge to go back. The order is set when a deck is picked.
- A small celebration every 10 cards, and a big finish (trophy and confetti) after the last card.
- The 🗣️ button on the start screen switches between the device's voices.
- Works offline once it's loaded, and can be installed to a phone or tablet home screen.

**Play it:** https://thomaspmahan.github.io/fun-cards/

(This repo started as Bubble Pop Pals, under the name Bubble-pop. That version is still in the commit history.)

## Files

| File | What it does |
|---|---|
| `index.html` | The page itself |
| `style.css` | Colors, fonts, card layout and animations |
| `game.js` | The word lists and all the game logic |
| `andika-bold.woff2` | Andika, a font made for beginning readers (SIL Open Font License, see `andika-LICENSE.txt`) |
| `manifest.json` | Tells phones the app's name and icon so it can be installed |
| `sw.js` | Service worker: saves the files so the game works offline |
| `icon-*.png` | App icons |

## Making changes

1. Edit a file (on github.com, open the file and click the pencil icon).
2. In `sw.js`, bump the number in `fun-cards-v3` (to v4, v5 and so on), or devices will keep showing the old version.
3. Commit. GitHub Pages updates the live site in a minute or two.

Easy first tweaks in `game.js`:
- `MY_WORDS`: put the words from his teacher's list here, and a **My Words** button appears on the start screen
- `STARTER` / `NEXT_UP`: the Dolch Pre-Primer and Primer lists, plus 8 First Grade words (100 total in All Words)
- `SAY_AS`: fixes for words the voice misreads (like "I")
- `EDGE_COLORS`: the card edge colors
- `rate = 0.8` in `say()`: how fast the word is read (1 is normal speed)
- `count % 10`: how often the celebration happens
