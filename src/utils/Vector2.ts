export class Vector2 {
  x: number;
  y: number;

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  set(x: number, y: number): Vector2 {
    this.x = x;
    this.y = y;
    return this;
  }

  copy(v: Vector2): Vector2 {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  add(v: Vector2): Vector2 {
    return new Vector2(this.x + v.x, this.y + v.y);
  }

  addMut(v: Vector2): Vector2 {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v: Vector2): Vector2 {
    return new Vector2(this.x - v.x, this.y - v.y);
  }

  subMut(v: Vector2): Vector2 {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  mul(s: number): Vector2 {
    return new Vector2(this.x * s, this.y * s);
  }

  mulMut(s: number): Vector2 {
    this.x *= s;
    this.y *= s;
    return this;
  }

  div(s: number): Vector2 {
    if (s === 0) return new Vector2(0, 0);
    return new Vector2(this.x / s, this.y / s);
  }

  divMut(s: number): Vector2 {
    if (s === 0) {
      this.x = 0;
      this.y = 0;
      return this;
    }
    this.x /= s;
    this.y /= s;
    return this;
  }

  dot(v: Vector2): number {
    return this.x * v.x + this.y * v.y;
  }

  cross(v: Vector2): number {
    return this.x * v.y - this.y * v.x;
  }

  magnitude(): number {
    return Math.hypot(this.x, this.y);
  }

  magnitudeSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  normalize(): Vector2 {
    const mag = this.magnitude();
    if (mag === 0) return new Vector2(0, 0);
    return new Vector2(this.x / mag, this.y / mag);
  }

  normalizeMut(): Vector2 {
    const mag = this.magnitude();
    if (mag === 0) {
      this.x = 0;
      this.y = 0;
      return this;
    }
    this.x /= mag;
    this.y /= mag;
    return this;
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  rotate(angleRad: number): Vector2 {
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    return new Vector2(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
  }

  rotateMut(angleRad: number): Vector2 {
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const x = this.x * cos - this.y * sin;
    const y = this.x * sin + this.y * cos;
    this.x = x;
    this.y = y;
    return this;
  }

  lerp(to: Vector2, t: number): Vector2 {
    return new Vector2(
      this.x + (to.x - this.x) * t,
      this.y + (to.y - this.y) * t
    );
  }

  static fromAngle(angleRad: number, magnitude = 1): Vector2 {
    return new Vector2(Math.cos(angleRad) * magnitude, Math.sin(angleRad) * magnitude);
  }

  static zero(): Vector2 {
    return new Vector2(0, 0);
  }
}
