import { describe, it, expect } from 'vitest';
import { ObjectPool } from './ObjectPool';

describe('ObjectPool', () => {
  it('reuses objects after release', () => {
    const pool = new ObjectPool(() => ({ value: Math.random() }), 1);
    const first = pool.acquire();

    expect(pool.size()).toBe(0);

    pool.release(first);

    expect(pool.size()).toBe(1);

    const second = pool.acquire();
    expect(second).toBe(first);
  });

  it('grows when demand exceeds initial size', () => {
    let created = 0;
    const pool = new ObjectPool(() => ({ id: created++ }), 0);

    const a = pool.acquire();
    const b = pool.acquire();

    expect(created).toBe(2);

    pool.release(a);
    pool.release(b);

    expect(pool.size()).toBe(2);
  });
});
