import { Engine, DisplayMode, Color } from 'excalibur';

let engine: Engine | null = null;

export function createEngine(canvas: HTMLCanvasElement): Engine {
  engine = new Engine({
    canvasElement: canvas,
    displayMode: DisplayMode.FitScreen,
    backgroundColor: Color.fromHex('#0a1628'),
    antialiasing: false,
  });

  return engine;
}

export function getEngine(): Engine | null {
  return engine;
}

export function startEngine(): Promise<void> {
  if (!engine) return Promise.resolve();
  return engine.start();
}

export function stopEngine(): void {
  if (!engine) return;
  engine.stop();
}
