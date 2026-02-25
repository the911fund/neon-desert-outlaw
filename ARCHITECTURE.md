# Architecture — Neon Desert Outlaw

## Directory Structure
```
src/
├── main.ts                    # Entry point, app bootstrap
├── game/
│   ├── Game.ts                # Main game loop, state management
│   ├── GameConfig.ts          # Constants, tuning parameters
│   └── InputManager.ts        # Keyboard + touch input abstraction
├── physics/
│   ├── BicycleModel.ts        # Vehicle physics (bicycle model)
│   ├── SurfaceTypes.ts        # Friction coefficients per surface
│   ├── DriftState.ts          # Drift detection + state machine
│   └── Vector2.ts             # 2D vector math utilities
├── world/
│   ├── WorldManager.ts        # Chunk loading/unloading
│   ├── Chunk.ts               # Single 2048x2048 chunk
│   ├── PoissonDisc.ts         # Poisson-disc sampling
│   ├── TerrainGenerator.ts    # Surface type generation per chunk
│   └── ObstacleFactory.ts     # Rocks, trees, outposts, wrecks
├── rendering/
│   ├── Camera.ts              # World-North camera with look-ahead
│   ├── LightingSystem.ts      # Dynamic lights, headlights, neon
│   ├── ParticleSystem.ts      # Tire tracks, dust, sparks
│   ├── BloomFilter.ts         # Post-processing bloom
│   └── SpriteManager.ts       # Asset loading + sprite management
├── vehicle/
│   ├── Vehicle.ts             # Vehicle entity (sprite + physics + state)
│   ├── VehicleRenderer.ts     # Visual representation + damage
│   └── Headlights.ts          # Dynamic light cone rendering
├── ui/
│   ├── HUD.ts                 # Speed, fuel, score overlay
│   ├── MiniMap.ts             # Corner minimap
│   └── TouchControls.ts       # Mobile virtual joystick
└── utils/
    ├── MathUtils.ts           # Clamp, lerp, angle helpers
    └── ObjectPool.ts          # Object pooling for particles
```

## Build Pipeline
- `pnpm dev` — Vite dev server with HMR
- `pnpm build` — Production build
- `pnpm lint` — ESLint strict
- `pnpm typecheck` — tsc --noEmit
- `pnpm test` — Vitest (physics + world gen unit tests)

## Rendering Pipeline (per frame)
1. Update physics (fixed timestep 60Hz)
2. Update world chunks (load/unload based on camera)
3. Update particles
4. Update camera (follow vehicle + look-ahead)
5. Render world chunks (terrain + obstacles)
6. Render vehicle
7. Render particles (tire tracks, dust)
8. Apply post-processing (bloom on neon)
9. Render HUD overlay

## Physics Update Order
1. Read input → steering angle, throttle, brake
2. Bicycle model → compute forces
3. Surface check → get friction coefficient
4. Lateral force check → drift state transition
5. Integrate velocity + position
6. Emit particles based on state (drift = neon tracks, sand = dust)
