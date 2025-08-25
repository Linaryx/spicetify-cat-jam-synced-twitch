# Cat Jam Synced (Fork)

![preview](marketplace/preview.gif)

Make a cat appear next to your progress bar, jamming along with your music synchronized to the beat!

> ⚙ are located at the bottom of the regular Spotify settings.

## About this fork

This is a fork of the "spicetify-cat-jam-synced" extension with a number of improvements:

- Refactored codebase (services/utils split), constants centralized
- Twitch chat integration (send current track + BPM), reconnect button
- Configurable BPM calculation (Track BPM / Danceability+Energy), fixed cooldown resend
- WebM placement: Bottom (player) or Left (library), adjustable size
- Dark-styled buttons and better settings grouping (section headers)

Original project: https://github.com/BlafKing/spicetify-cat-jam-synced

# Changelog 📋

<h3>v1.2.5</h3>

- Added better BPM calculation for songs based on songs danceability and energy.
- Can be toggled from the settings.
- Fixed minor bugs.

<h3>v1.2.0</h3>

- Added ability to position and resize webM video to the left library.
- Changed "Reload" button label to a "Save and reload".

<h4>Dev changes </h4>

- Changed from npm to yarn.

<h3>v1.1</h3>

- Added ability to select custom webM link and default BPM in the spotify settings tab.

---

<h3>v1.0</h3>

- Initial release

---

## Made with Spicetify Creator

- https://github.com/spicetify/spicetify-creator

---

## Build & Install

Prerequisites: Node.js 18+, Spicetify.

Install deps:

```bash
npm ci
```

Build (for development):

```bash
npm run build
```

Local apply to Spicetify (build to `dist` and copy to Extensions):

```bash
npm run build-apply
```

### Build for Marketplace

1) Build bundle:

```bash
npm run build
```

2) Copy bundle for Marketplace:

```powershell
Copy-Item -Force dist/cat-jam.js marketplace/cat-jam.js
```

3) Commit `marketplace/cat-jam.js` and `marketplace/preview.gif`, then open a PR to the Marketplace repo following their contribution guide.

---

## Credits

- Original idea and assets: BlafKing (Cat Jam Synced)
- This fork: additional features, refactor and Marketplace packaging

## License

MIT
