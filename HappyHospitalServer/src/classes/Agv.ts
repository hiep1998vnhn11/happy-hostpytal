// main agv

import { movingGameObject } from './movingGameObject'

export class Agv extends movingGameObject {
  public finish = false
  public desX: number
  public desY: number
  constructor(
    x: number,
    y: number,
    sizeWidth: number,
    sizeHeight: number,
    serverId: string,
    clientId: string,
    desX: number,
    desY: number
  ) {
    super(x, y, sizeWidth, sizeHeight, serverId, clientId)
    this.desX = desX
    this.desY = desY
  }
}
