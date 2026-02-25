# 🏎️ Neon Desert Outlaw — Game Design Document

## Core Aesthetic
High-fidelity 2D Top-Down. Realism through dynamic lighting, bloom, and physics-driven particle trails (neon tire tracks, dust).

## Engine
PixiJS (WebGL/WebGPU) + TypeScript + Vite

## Three Pillars

### 1. The Physics Engine (Sim-Lite)
- **NO basic x/y incrementing**
- **Vector-based Steering:** Bicycle model for vehicle physics
- **Friction & Slip:** Friction coefficient varies by surface (Sand vs Road)
- **Grip Threshold:** When lateral force exceeds grip, initiates "Drift State"
- **Drift State:** Neon tire tracks, reduced traction, counter-steer recovery

### 2. The Camera System (World-North with Lead)
- Map stays oriented North (no camera rotation)
- **Look-Ahead Logic:** Camera pivot offsets based on car's velocity vector
- Player sees obstacles before they arrive
- Smooth interpolation on camera movement

### 3. The World (Procedural Chunking)
- **WorldManager** loads/unloads 2048×2048 pixel chunks
- **Poisson-disc sampling** for placing:
  - Neon outposts (rest stops, fuel stations, settlements)
  - Desert obstacles (rocks, dead trees, cacti, wrecks)
  - Road segments and intersections
- Realistic spacing without overlap
- Chunks stream in/out based on camera position

## Visual Systems
- Dynamic lighting (headlights, neon signs, ambient desert light)
- Bloom post-processing on neon elements
- Physics-driven particle trails:
  - Neon tire tracks (persist on ground)
  - Dust clouds on sand
  - Sparks on collision
- Day/night cycle with lighting transitions

## Vehicle
- Porsche 911 (top-down, detailed sprite)
- Multi-directional movement (full 360°)
- Engine sound tied to RPM
- Damage model (visual)
- Headlights cast dynamic light cones

## Controls
- WASD / Arrow keys for steering + throttle/brake
- Space for handbrake (drift initiation)
- Touch controls for mobile (virtual joystick + buttons)

## Tech Stack
- **Runtime:** PixiJS 8.x (WebGL2/WebGPU)
- **Language:** TypeScript (strict mode)
- **Bundler:** Vite
- **Physics:** Custom bicycle model (no external physics lib)
- **Audio:** Howler.js or PixiJS sound
- **CI:** GitHub Actions (lint, type-check, build)
- **Deploy:** GitHub Pages or Vercel
