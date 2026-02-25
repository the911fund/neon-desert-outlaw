# AGENT TASK: Scaffold + Physics Engine

You are building "Neon Desert Outlaw" - a high-fidelity 2D top-down driving game.

Read GAME_DESIGN.md and ARCHITECTURE.md in this repo for the full spec.

YOUR TASK: Scaffold the project AND implement the physics engine + basic rendering.

## Step 1: Project Scaffold
- Initialize with npm: npm init -y, install PixiJS 8.x, TypeScript, Vite, ESLint, Vitest
- Use npm (not pnpm/yarn)
- Create the full directory structure from ARCHITECTURE.md
- Configure: tsconfig.json (strict), vite.config.ts, eslint.config.js, vitest.config.ts
- Create index.html entry point that loads the PixiJS app
- GitHub Actions CI: lint + typecheck + build + test

## Step 2: Core Systems
- src/utils/Vector2.ts - Full 2D vector math (add, sub, mul, dot, cross, normalize, rotate, lerp, angle, magnitude)
- src/physics/BicycleModel.ts - Bicycle model vehicle physics:
  - Front/rear axle positions
  - Steering angle input to wheel direction
  - Engine force + braking force
  - Weight transfer under acceleration/braking
  - Compute lateral/longitudinal forces per tire
- src/physics/SurfaceTypes.ts - Surface enum + friction coefficients (Road=0.9, Sand=0.5, Gravel=0.65)
- src/physics/DriftState.ts - State machine: Normal to Drifting to Recovery
  - Transitions based on lateral force vs grip threshold
  - Drift multiplier affects friction
  - Counter-steer detection for recovery

## Step 3: Basic Rendering (prove it works)
- src/main.ts - Bootstrap PixiJS Application
- src/game/Game.ts - Game loop with fixed timestep physics (60Hz) + variable render
- src/game/InputManager.ts - Keyboard input (WASD + arrows + space for handbrake)
- src/vehicle/Vehicle.ts - Vehicle entity tying physics to a PixiJS sprite
- Render a simple colored rectangle as the car for now
- Draw surface type indicators (colored ground tiles)
- The car MUST move with full bicycle model physics, not basic x/y
- Drifting must visually show (rotation decoupled from velocity direction)

## Step 4: Unit Tests
- Vector2 math tests
- BicycleModel: verify forces, steering response
- DriftState: verify state transitions
- SurfaceTypes: verify friction lookups

## Deliverables
- npm run dev opens browser with a drivable car using bicycle model physics
- npm test passes all unit tests
- npm run build produces production bundle
- npm run lint and npm run typecheck pass clean

When done: commit all changes, push the branch, create a PR with gh pr create --fill.
Then run: openclaw system event --text "Done: scaffold + physics engine complete for neon-desert-outlaw" --mode now
