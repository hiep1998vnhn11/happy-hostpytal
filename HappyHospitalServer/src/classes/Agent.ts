import { Socket } from 'socket.io'
import { movingGameObject } from './movingGameObject'
import { AgentObject } from './GameObject'
import { Astar } from '../algorithm/AStarSearch'
import { calPathAstar, calPathAstarGrid } from '../algorithm'
import { Position } from './position'
import * as socketEvents from '../socketEvents'
import { AstarSearch } from 'src/algorithm/astar'

export class Agent extends movingGameObject {
  public id: number
  private vertexs: Position[] = []
  private groundPos: Position[]
  desX: number
  desY: number
  constructor(
    x: number,
    y: number,
    sizeWidth: number,
    sizeHeight: number,
    serverId: string,
    agentObject: AgentObject,
    groundPos: Position[],
    socket: Socket,
    clientId: string,
    desX: number,
    desY: number,
    astar: AstarSearch
  ) {
    super(x, y, sizeWidth, sizeHeight, serverId, clientId)
    this.id = agentObject.id
    this.desX = desX
    this.desY = desY
    // this.vertexs = calPathAstarGrid(
    //   52,
    //   28,
    //   groundPos,
    //   new Position(agentObject.startPos.x, agentObject.startPos.y),
    //   new Position(agentObject.endPos.x, agentObject.endPos.y)
    // )
    this.vertexs = astar.search(
      new Position(agentObject.startPos.x, agentObject.startPos.y),
      new Position(agentObject.endPos.x, agentObject.endPos.y)
    )
    this.groundPos = groundPos
    console.log(
      `Agent có id ${this.id} đã được tạo đường đi và thêm vào màn chơi!`
    )
    socket.emit(socketEvents.events.sendAgentPathToClient, {
      id: this.id,
      vertexs: this.vertexs,
    })
  }

  recal(pos: Position, socket: Socket) {
    this.vertexs = calPathAstarGrid(
      52,
      28,
      this.groundPos,
      new Position(pos.x, pos.y),
      new Position(this.desX, this.desY)
    )
    socket.emit(socketEvents.events.sendAgentPathToClient, {
      id: this.id,
      vertexs: this.vertexs,
    })
  }
}
