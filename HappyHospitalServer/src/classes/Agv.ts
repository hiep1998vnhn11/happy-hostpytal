// main agv

import { movingGameObject } from './movingGameObject'

export class Agv extends movingGameObject {
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
