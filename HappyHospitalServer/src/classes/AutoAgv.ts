import { movingGameObject } from './movingGameObject'

export class AutoAgv extends movingGameObject {
  constructor(
    x: number,
    y: number,
    sizeWidth: number,
    sizeHeight: number,
    serverId: string
  ) {
    super(x, y, sizeWidth, sizeHeight, serverId)
  }
}
