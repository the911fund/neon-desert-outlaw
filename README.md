# 🏎️ Neon Desert Outlaw

A neon-soaked, physics-driven desert racing game built with PixiJS and TypeScript.

![License](https://img.shields.io/badge/license-ISC-blue)

## 🎮 Play

**[Play Online](https://the911fund.github.io/neon-desert-outlaw/)** — runs in any modern browser, desktop or mobile.

## About

Neon Desert Outlaw is a top-down racing game set in a procedurally generated desert. Race through neon-lit outposts, drift across sand dunes, and compete against AI opponents — all rendered with dynamic lighting, bloom effects, and physics-driven particle trails.

### Features

- **Physics-based driving** — bicycle model with realistic friction, drift mechanics, and surface-dependent grip
- **Procedural world** — infinite desert generated with Poisson-disc sampling, chunked terrain streaming
- **Dynamic lighting** — headlights, neon glow, bloom post-processing
- **Multiple game modes** — Quick Race and Story Mode
- **AI opponents** — race against bots with distinct driving personalities
- **Mobile support** — touch controls with virtual joystick, responsive UI
- **Synthwave audio** — procedurally generated soundtrack with in-game music controls

## 🕹️ Controls

### Keyboard
| Key | Action |
|-----|--------|
| W / ↑ | Accelerate |
| S / ↓ | Brake / Reverse |
| A / ← | Steer Left |
| D / → | Steer Right |
| Space | Handbrake |
| M | Toggle Sound |
| Enter | Start Race / Confirm |
| ESC | Back to Menu |

### Mobile / Touch
- **Left joystick** — steer and accelerate (push up to go, tilt to steer)
- **B button** — brake
- **H button** — handbrake

## 🛠️ Development

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Setup

```bash
git clone https://github.com/the911fund/neon-desert-outlaw.git
cd neon-desert-outlaw
pnpm install
```

### Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server with HMR |
| `pnpm build` | Production build to `dist/` |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm test` | Run unit tests (Vitest) |

### Tech Stack

- **Engine:** [PixiJS](https://pixijs.com/) 8 (WebGL/WebGPU)
- **Language:** TypeScript
- **Bundler:** Vite
- **Testing:** Vitest

## 📁 Project Structure

```
src/
├── main.ts              # App entry point
├── game/                # Game loop, input, config, race mode
├── physics/             # Bicycle model, drift, surfaces, collisions
├── world/               # Procedural terrain, chunks, obstacles
├── rendering/           # Camera, lighting, particles, bloom
├── vehicle/             # Vehicle entity, renderer, headlights
├── ai/                  # Bot drivers and vehicles
├── story/               # Story mode missions and dialogue
├── ui/                  # HUD, minimap, menus, touch controls
└── utils/               # Math helpers, object pooling
```

## License

ISC
