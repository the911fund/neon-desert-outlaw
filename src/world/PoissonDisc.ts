export interface PoissonBounds {
  width: number;
  height: number;
  minX?: number;
  minY?: number;
}

export interface PoissonPoint {
  x: number;
  y: number;
}

export type PoissonRandom = () => number;

export class PoissonDisc {
  static sample(
    bounds: PoissonBounds,
    minDistance: number,
    maxCandidates = 30,
    random: PoissonRandom = Math.random
  ): PoissonPoint[] {
    if (bounds.width <= 0 || bounds.height <= 0 || minDistance <= 0) {
      return [];
    }

    const minX = bounds.minX ?? 0;
    const minY = bounds.minY ?? 0;
    const maxX = minX + bounds.width;
    const maxY = minY + bounds.height;

    const cellSize = minDistance / Math.SQRT2;
    const gridWidth = Math.ceil(bounds.width / cellSize);
    const gridHeight = Math.ceil(bounds.height / cellSize);
    const grid = new Array<number>(gridWidth * gridHeight).fill(-1);

    const points: PoissonPoint[] = [];
    const active: number[] = [];

    const initialPoint: PoissonPoint = {
      x: minX + random() * bounds.width,
      y: minY + random() * bounds.height,
    };

    points.push(initialPoint);
    active.push(0);
    grid[gridIndex(initialPoint)] = 0;

    while (active.length > 0) {
      const activeIndex = Math.floor(random() * active.length);
      const pointIndex = active[activeIndex];
      const point = points[pointIndex];

      let found = false;
      for (let i = 0; i < maxCandidates; i += 1) {
        const angle = random() * Math.PI * 2;
        const radius = minDistance * (1 + random());
        const candidate: PoissonPoint = {
          x: point.x + Math.cos(angle) * radius,
          y: point.y + Math.sin(angle) * radius,
        };

        if (!inBounds(candidate)) {
          continue;
        }

        if (isFarEnough(candidate)) {
          points.push(candidate);
          active.push(points.length - 1);
          grid[gridIndex(candidate)] = points.length - 1;
          found = true;
          break;
        }
      }

      if (!found) {
        active.splice(activeIndex, 1);
      }
    }

    return points;

    function inBounds(candidate: PoissonPoint): boolean {
      return candidate.x >= minX && candidate.x < maxX && candidate.y >= minY && candidate.y < maxY;
    }

    function gridIndex(candidate: PoissonPoint): number {
      const gx = Math.floor((candidate.x - minX) / cellSize);
      const gy = Math.floor((candidate.y - minY) / cellSize);
      return gx + gy * gridWidth;
    }

    function isFarEnough(candidate: PoissonPoint): boolean {
      const gx = Math.floor((candidate.x - minX) / cellSize);
      const gy = Math.floor((candidate.y - minY) / cellSize);

      const startX = Math.max(0, gx - 2);
      const endX = Math.min(gridWidth - 1, gx + 2);
      const startY = Math.max(0, gy - 2);
      const endY = Math.min(gridHeight - 1, gy + 2);

      for (let y = startY; y <= endY; y += 1) {
        for (let x = startX; x <= endX; x += 1) {
          const index = grid[x + y * gridWidth];
          if (index === -1) {
            continue;
          }
          const neighbor = points[index];
          const dx = neighbor.x - candidate.x;
          const dy = neighbor.y - candidate.y;
          if (dx * dx + dy * dy < minDistance * minDistance) {
            return false;
          }
        }
      }
      return true;
    }
  }
}
