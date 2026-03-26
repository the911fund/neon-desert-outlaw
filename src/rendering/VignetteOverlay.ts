import { Container, Graphics } from 'pixi.js';

/**
 * Cinematic vignette overlay — darkens screen edges to focus attention on center.
 * Uses layered edge rectangles to approximate a radial vignette with PixiJS Graphics.
 */
export class VignetteOverlay {
  readonly container: Container;
  private readonly graphics: Graphics;
  private width = 0;
  private height = 0;

  constructor() {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    // Non-interactive overlay — don't capture pointer events
    this.container.eventMode = 'none';
  }

  resize(width: number, height: number): void {
    if (this.width === width && this.height === height) return;
    this.width = width;
    this.height = height;
    this.redraw();
  }

  private redraw(): void {
    this.graphics.clear();
    const w = this.width;
    const h = this.height;

    // Draw darkened border bands from outermost (darkest) to innermost (lightest).
    // Each band is a frame-shaped region created by drawing a rect then
    // overlapping with the next smaller band.
    const bands = [
      { inset: 0, alpha: 0.35 },
      { inset: 0.06, alpha: 0.22 },
      { inset: 0.12, alpha: 0.14 },
      { inset: 0.20, alpha: 0.08 },
      { inset: 0.30, alpha: 0.03 },
    ];

    for (let i = 0; i < bands.length; i++) {
      const current = bands[i];
      const next = bands[i + 1];
      const x1 = w * current.inset;
      const y1 = h * current.inset;
      const bw = w - 2 * x1;
      const bh = h - 2 * y1;

      if (next) {
        const x2 = w * next.inset;
        const y2 = h * next.inset;
        // Top strip
        this.graphics.beginFill(0x000000, current.alpha);
        this.graphics.drawRect(x1, y1, bw, y2 - y1);
        this.graphics.endFill();
        // Bottom strip
        this.graphics.beginFill(0x000000, current.alpha);
        this.graphics.drawRect(x1, h - y2, bw, y2 - y1);
        this.graphics.endFill();
        // Left strip (between top and bottom)
        this.graphics.beginFill(0x000000, current.alpha);
        this.graphics.drawRect(x1, y2, x2 - x1, h - 2 * y2);
        this.graphics.endFill();
        // Right strip
        this.graphics.beginFill(0x000000, current.alpha);
        this.graphics.drawRect(w - x2, y2, x2 - x1, h - 2 * y2);
        this.graphics.endFill();
      } else {
        // Innermost band — fill the remaining center lightly
        this.graphics.beginFill(0x000000, current.alpha);
        this.graphics.drawRect(x1, y1, bw, bh);
        this.graphics.endFill();
      }
    }
  }
}
