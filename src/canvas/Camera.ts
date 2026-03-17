import type { Point } from '../model/types';

export class Camera {
  x = 0;
  y = 0;
  zoom = 1;

  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  setZoom(zoom: number) {
    this.zoom = Math.min(Math.max(zoom, 0.1), 5);
  }

  /** Convert screen coordinates to world (canvas) coordinates */
  screenToWorld(screenX: number, screenY: number, canvasWidth: number, canvasHeight: number): Point {
    return {
      x: (screenX - canvasWidth / 2) / this.zoom - this.x,
      y: (screenY - canvasHeight / 2) / this.zoom - this.y,
    };
  }

  /** Convert world coordinates to screen coordinates */
  worldToScreen(worldX: number, worldY: number, canvasWidth: number, canvasHeight: number): Point {
    return {
      x: (worldX + this.x) * this.zoom + canvasWidth / 2,
      y: (worldY + this.y) * this.zoom + canvasHeight / 2,
    };
  }

  /** Apply camera transform to a canvas context (DPR-aware) */
  applyTransform(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, dpr: number = 1) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(this.x, this.y);
  }
}
