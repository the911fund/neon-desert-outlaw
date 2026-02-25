export enum SurfaceType {
  Road = 'Road',
  Sand = 'Sand',
  Gravel = 'Gravel',
}

export const SurfaceFriction: Record<SurfaceType, number> = {
  [SurfaceType.Road]: 0.9,
  [SurfaceType.Sand]: 0.5,
  [SurfaceType.Gravel]: 0.65,
};

export const SurfaceColors: Record<SurfaceType, number> = {
  [SurfaceType.Road]: 0x2b2b2b,
  [SurfaceType.Sand]: 0xd8b07a,
  [SurfaceType.Gravel]: 0x8a7f7a,
};

export function getSurfaceFriction(surface: SurfaceType): number {
  return SurfaceFriction[surface];
}
