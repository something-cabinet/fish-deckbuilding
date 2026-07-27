import { Scene, Color } from 'excalibur';

export class MapScene extends Scene {
  onInitialize() {
    this.backgroundColor = Color.fromHex('#0f2236');
  }
}
