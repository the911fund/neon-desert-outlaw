# AGENT TASK: Full Integration

This repo has a master branch with the scaffold + vehicle-hud already merged.
Two feature branches still need to be merged and integrated:

- origin/feat/world-gen (procedural world generation)
- origin/feat/lighting-particles (lighting, bloom, particles)

YOUR TASK:

## Step 1: Merge both branches
Run these commands:
```
git fetch origin
git merge origin/feat/world-gen --no-edit
```
If there are conflicts (likely in src/game/Game.ts), resolve them by keeping ALL functionality from both sides. The Game.ts file needs to initialize and update ALL systems.

Then:
```
git merge origin/feat/lighting-particles --no-edit
```
Again resolve any conflicts by combining all code.

## Step 2: Wire everything together in Game.ts

The Game class must initialize and update ALL systems each frame:

1. InputManager - read keyboard/touch input
2. Vehicle physics (BicycleModel) - update with input + surface friction
3. DriftState - check lateral force, transition states
4. WorldManager - load/unload chunks based on camera position
5. TerrainGenerator - provide surface type at vehicle position to physics
6. ParticleSystem - emit particles based on vehicle state:
   - Drift state = neon tire tracks
   - Sand surface = dust clouds
   - High speed on road = road spray
7. LightingSystem - update ambient light (day/night cycle)
8. Headlights - update position/rotation to match vehicle
9. Camera - follow vehicle with look-ahead offset
10. BloomFilter - apply to neon elements
11. HUD - update speed, drift indicator, surface type
12. MiniMap - update vehicle position, nearby chunks

## Step 3: Render order in Game.ts
1. World chunks (terrain + obstacles) — lowest layer
2. Neon tire tracks (persist on ground)
3. Vehicle with underglow
4. Dust/spark particles
5. Lighting overlay (darkness + light sources)
6. Bloom post-processing
7. HUD (fixed, on top)
8. MiniMap (fixed, on top)

## Step 4: Make sure surface type feeds physics
- When vehicle moves, query WorldManager/TerrainGenerator for surface at vehicle position
- Pass surface friction to BicycleModel
- This is the critical gameplay loop: sand = slippery, road = grippy

## Step 5: Verify everything
- npm run typecheck must pass
- npm test must pass (all existing tests)
- npm run build must succeed
- npm run dev should show: drivable car on procedural terrain with lighting and particles

## Deliverables
Commit the integration, push, create PR with gh pr create --fill.
Then run: openclaw system event --text "Done: full integration complete - all systems wired" --mode now
