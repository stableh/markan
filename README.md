# MarkAn

MarkAn is a local-first Markdown editor for macOS built with Electron, React, and Milkdown.

## Features
- Local-first notes with workspace folder support (`.md`, `.txt`)
- Notion-like block editing experience (Milkdown)
- Customizable keyboard shortcuts
- Autosave for dirty notes
- macOS file association support (`.md`, `.txt`)
- Optional in-app update flow UI (requires updater publish config)

## Tech Stack
- Electron + electron-vite
- React + TypeScript
- Tailwind CSS
- Zustand
- Milkdown (Crepe)

## Development
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## macOS Package
```bash
npm run build:mac
```

Output is generated under `dist/`.

## Notes on Updates
The app UI includes update-check actions. To make auto-update fully functional in releases, configure an `electron-builder` `publish` provider and include `electron-updater` in your release pipeline.

## License
MIT
