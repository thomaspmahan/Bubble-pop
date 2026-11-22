# Bubble Pop Pals

A simple bubble-popping game for little kids, built as a Progressive Web App (PWA).

- Tap bubbles to pop them. Each pop says the color out loud.
- Every 10 pops there's a celebration.
- There's no way to lose.
- Works offline once it's loaded, and can be installed to a phone or tablet home screen.

**Play it:** https://thomaspmahan.github.io/Bubble-pop/

## Files

| File | What it does |
|---|---|
| `index.html` | The page itself |
| `style.css` | Colors, fonts and layout |
| `game.js` | All the game logic: bubbles, popping, sounds, voice |
| `manifest.json` | Tells phones the app's name and icon so it can be installed |
| `sw.js` | Service worker: saves the files so the game works offline |
| `icon-*.png` | App icons |

## Making changes

1. Edit a file (on github.com, open the file and click the pencil icon).
2. In `sw.js`, bump `bubble-pop-v1` to `bubble-pop-v2` (and so on), or devices will keep showing the old version.
3. Commit. GitHub Pages updates the live site in a minute or two.

Easy first tweaks in `game.js`:
- `PALS`: the animal emoji inside the bubbles
- `COLORS`: the bubble colors and their names
- `speed: rand(45, 90)`: how fast bubbles float
- `score % 10`: how often the celebration happens
