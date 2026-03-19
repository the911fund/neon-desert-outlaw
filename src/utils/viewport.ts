export interface ViewportSize {
  width: number;
  height: number;
}

export function getViewportSize(): ViewportSize {
  const viewport = window.visualViewport;

  return {
    width: Math.round(viewport?.width ?? window.innerWidth),
    height: Math.round(viewport?.height ?? window.innerHeight),
  };
}
