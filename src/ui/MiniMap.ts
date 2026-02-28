import { Container, Graphics } from 'pixi.js';
import { SurfaceType, SurfaceColors } from '../physics/SurfaceTypes';

export interface MiniMapChunk {
  x: number;
  y: number;
  surfaceGrid: SurfaceType[][];
}

export interface MiniMapObstacle {
  x: number;
  y: number;
  type: 'rock' | 'tree' | 'wreck' | 'outpost';
}

export interface MiniMapState {
  vehicleX: number;
  vehicleY: number;
  vehicleHeading: number;
  chunks: MiniMapChunk[];
  obstacles: MiniMapObstacle[];
  tileSize: number;
}

export class MiniMap {
  readonly container: Container;

  private background: Graphics;
  private terrain: Graphics;
  private chunkGrid: Graphics;
  private obstacles: Graphics;
  private vehicleMarker: Graphics;
  private mask: Graphics;
  private border: Graphics;

  private readonly size = 150;
  private readonly scale = 0.05; // World units to minimap pixels
  private readonly neonCyan = 0x00ffff;
  private readonly neonMagenta = 0xff00ff;
  private readonly bgColor = 0x0a0a0a;

  constructor() {
    this.container = new Container();

    this.background = new Graphics();
    this.terrain = new Graphics();
    this.chunkGrid = new Graphics();
    this.obstacles = new Graphics();
    this.vehicleMarker = new Graphics();
    this.mask = new Graphics();
    this.border = new Graphics();

    // Build minimap structure
    this.drawBackground();
    this.drawBorder();
    this.drawVehicleMarker();
    this.createMask();

    this.container.addChild(this.background);
    this.container.addChild(this.terrain);
    this.container.addChild(this.chunkGrid);
    this.container.addChild(this.obstacles);
    this.container.addChild(this.vehicleMarker);
    this.container.addChild(this.border);

    // Apply circular mask
    this.terrain.mask = this.mask;
    this.chunkGrid.mask = this.mask;
    this.obstacles.mask = this.mask;
    this.container.addChild(this.mask);
  }

  private drawBackground(): void {
    this.background.clear();

    // Dark background with slight transparency
    this.background.beginFill(this.bgColor, 0.85);
    this.background.drawCircle(this.size / 2, this.size / 2, this.size / 2);
    this.background.endFill();
  }

  private drawBorder(): void {
    this.border.clear();

    // Neon border
    this.border.lineStyle(2, this.neonCyan, 0.6);
    this.border.drawCircle(this.size / 2, this.size / 2, this.size / 2 - 1);

    // Inner subtle ring
    this.border.lineStyle(1, this.neonCyan, 0.2);
    this.border.drawCircle(this.size / 2, this.size / 2, this.size / 2 - 10);
  }

  private drawVehicleMarker(): void {
    this.vehicleMarker.clear();

    // Vehicle as a small triangle pointing in heading direction
    this.vehicleMarker.beginFill(this.neonMagenta);
    this.vehicleMarker.drawPolygon([
      0, -6,   // tip
      4, 4,    // right
      -4, 4,   // left
    ]);
    this.vehicleMarker.endFill();

    // Glow effect
    this.vehicleMarker.beginFill(this.neonMagenta, 0.3);
    this.vehicleMarker.drawCircle(0, 0, 8);
    this.vehicleMarker.endFill();

    // Position at center
    this.vehicleMarker.position.set(this.size / 2, this.size / 2);
  }

  private createMask(): void {
    this.mask.clear();
    this.mask.beginFill(0xffffff);
    this.mask.drawCircle(this.size / 2, this.size / 2, this.size / 2 - 2);
    this.mask.endFill();
  }

  private worldToMinimap(worldX: number, worldY: number, vehicleX: number, vehicleY: number): { x: number; y: number } {
    // Convert world position to minimap position (relative to vehicle at center)
    const relX = (worldX - vehicleX) * this.scale;
    const relY = (worldY - vehicleY) * this.scale;

    return {
      x: this.size / 2 + relX,
      y: this.size / 2 + relY,
    };
  }

  private drawTerrain(state: MiniMapState): void {
    this.terrain.clear();

    const centerX = this.size / 2;
    const centerY = this.size / 2;
    const viewRadius = this.size / 2 / this.scale;

    // Draw simplified terrain based on surface grid
    for (const chunk of state.chunks) {
      const gridSize = chunk.surfaceGrid.length;
      if (gridSize === 0) continue;

      const tileWorldSize = state.tileSize;
      const tileMiniSize = tileWorldSize * this.scale;

      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < chunk.surfaceGrid[row].length; col++) {
          const worldX = chunk.x + col * tileWorldSize;
          const worldY = chunk.y + row * tileWorldSize;

          // Skip if too far from vehicle
          const dx = worldX - state.vehicleX;
          const dy = worldY - state.vehicleY;
          if (Math.abs(dx) > viewRadius || Math.abs(dy) > viewRadius) continue;

          const surface = chunk.surfaceGrid[row][col];
          const color = SurfaceColors[surface];

          const pos = this.worldToMinimap(worldX, worldY, state.vehicleX, state.vehicleY);

          // Draw tile
          this.terrain.beginFill(color, 0.6);
          this.terrain.drawRect(pos.x, pos.y, tileMiniSize + 1, tileMiniSize + 1);
          this.terrain.endFill();
        }
      }
    }
  }

  private drawChunkGrid(state: MiniMapState): void {
    this.chunkGrid.clear();

    const chunkSize = 2048; // Assuming standard chunk size
    const viewRadius = this.size / 2 / this.scale;

    this.chunkGrid.lineStyle(1, 0x333333, 0.3);

    // Draw chunk boundaries near vehicle
    const startChunkX = Math.floor((state.vehicleX - viewRadius) / chunkSize) * chunkSize;
    const startChunkY = Math.floor((state.vehicleY - viewRadius) / chunkSize) * chunkSize;
    const endChunkX = Math.ceil((state.vehicleX + viewRadius) / chunkSize) * chunkSize;
    const endChunkY = Math.ceil((state.vehicleY + viewRadius) / chunkSize) * chunkSize;

    // Vertical lines
    for (let x = startChunkX; x <= endChunkX; x += chunkSize) {
      const pos1 = this.worldToMinimap(x, startChunkY, state.vehicleX, state.vehicleY);
      const pos2 = this.worldToMinimap(x, endChunkY, state.vehicleX, state.vehicleY);
      this.chunkGrid.moveTo(pos1.x, pos1.y);
      this.chunkGrid.lineTo(pos2.x, pos2.y);
    }

    // Horizontal lines
    for (let y = startChunkY; y <= endChunkY; y += chunkSize) {
      const pos1 = this.worldToMinimap(startChunkX, y, state.vehicleX, state.vehicleY);
      const pos2 = this.worldToMinimap(endChunkX, y, state.vehicleX, state.vehicleY);
      this.chunkGrid.moveTo(pos1.x, pos1.y);
      this.chunkGrid.lineTo(pos2.x, pos2.y);
    }
  }

  private drawObstacles(state: MiniMapState): void {
    this.obstacles.clear();

    const viewRadius = this.size / 2 / this.scale;

    for (const obstacle of state.obstacles) {
      // Skip if too far
      const dx = obstacle.x - state.vehicleX;
      const dy = obstacle.y - state.vehicleY;
      if (Math.abs(dx) > viewRadius || Math.abs(dy) > viewRadius) continue;

      const pos = this.worldToMinimap(obstacle.x, obstacle.y, state.vehicleX, state.vehicleY);

      let color = 0x666666;
      let radius = 2;

      switch (obstacle.type) {
        case 'rock':
          color = 0x888888;
          radius = 2;
          break;
        case 'tree':
          color = 0x44aa44;
          radius = 2;
          break;
        case 'wreck':
          color = 0xaa4444;
          radius = 3;
          break;
        case 'outpost':
          color = this.neonCyan;
          radius = 4;
          break;
      }

      this.obstacles.beginFill(color, 0.8);
      this.obstacles.drawCircle(pos.x, pos.y, radius);
      this.obstacles.endFill();
    }
  }

  update(state: MiniMapState): void {
    // Update vehicle heading
    this.vehicleMarker.rotation = state.vehicleHeading;

    // Redraw terrain and obstacles relative to vehicle
    this.drawTerrain(state);
    this.drawChunkGrid(state);
    this.drawObstacles(state);
  }

  setPosition(screenWidth: number, screenHeight: number): void {
    // Scale down on mobile screens
    const scale = screenWidth < 768 ? 0.65 : 1;
    this.container.scale.set(scale);

    // Position in top-right corner with padding
    const effectiveSize = this.size * scale;
    this.container.position.set(screenWidth - effectiveSize - 16, 16);
  }
}
