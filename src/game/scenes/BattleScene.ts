import { Scene, Color } from 'excalibur';

export class BattleScene extends Scene {
  onInitialize() {
    this.backgroundColor = Color.fromHex('#162a40');
  }
}
