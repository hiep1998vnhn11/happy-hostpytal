// main agv

import { movingGameObject } from './movingGameObject'

export class Agv extends movingGameObject {
  public finish = false
  constructor(
    x: number,
    y: number,
    sizeWidth: number,
    sizeHeight: number,
    serverId: string,
    finish: boolean
  ) {
    super(x, y, sizeWidth, sizeHeight, serverId)
  }
}
