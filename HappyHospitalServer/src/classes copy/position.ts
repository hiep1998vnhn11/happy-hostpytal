import { MainScene } from '../scenes'
export class Position {
  public x: number
  public y: number
  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  static between(x: Position, y: Position): number {
    return Math.sqrt((x.x - y.x) ** 2 + (x.y - y.y) ** 2)
  }

  validAgent(): boolean {
    if (this.x === MainScene.AGV_START_X && this.y === MainScene.AGV_START_Y)
      return false
    if (
      this.x === MainScene.AGV_START_X &&
      this.y === MainScene.AUTO_AGV_START_Y
    )
      return false
    if (this.x === MainScene.EXIT_X && MainScene.EXIT_Y.includes(this.y))
      return false
    return true
  }
}
