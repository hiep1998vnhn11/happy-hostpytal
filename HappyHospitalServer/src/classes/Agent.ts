import { Socket } from 'socket.io'
import { movingGameObject } from './movingGameObject'
import { AgentObject } from './GameObject'
import { Astar } from '../algorithm/AStarSearch'
import { Position } from './position'
import * as socketEvents from '../socketEvents'

export class Agent extends movingGameObject {
  public id: number
  private astar: Astar
  private vertexs: Position[] = []
  constructor(
    x: number,
    y: number,
    sizeWidth: number,
    sizeHeight: number,
    serverId: string,
    agentObject: AgentObject,
    groundPos: Position[],
    socket: Socket,
    clientId
  ) {
    super(x, y, sizeWidth, sizeHeight, serverId, clientId)
    this.id = agentObject.id
    this.astar = new Astar(
      52,
      28,
      new Position(agentObject.startPos.x, agentObject.startPos.y),
      new Position(agentObject.endPos.x, agentObject.endPos.y),
      groundPos
    )
    this.vertexs = this.astar.cal() || []
    console.log(
      `Agent có id ${this.id} đã được tạo đường đi và thêm vào màn chơi!`
    )
    socket.emit(socketEvents.events.sendAgentPathToClient, {
      id: this.id,
      vertexs: this.vertexs,
    })
  }

  recal(pos: Position, socket: Socket) {
    this.vertexs = this.astar.cal(pos) || []
    socket.emit(socketEvents.events.sendAgentPathToClient, {
      id: this.id,
      vertexs: this.vertexs,
    })
  }
}
