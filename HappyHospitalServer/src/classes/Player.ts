import { Agent } from './Agent'
import { Agv } from './Agv'
import { AutoAgv } from './autoAgv'
import { GameObject } from './GameObject'
const socketEvents = require('../socketEvents')
import { Position } from './position'
import { Socket } from 'socket.io'

export class Player {
  public agv: Agv
  public autoAgvs: AutoAgv[]
  public agents: Agent[]
  public groundPos: Position[]
  public doorPos: Position[]
  public defaultListTile: Array<Array<null | string>> = []
  public listTile: Array<Array<null | string>> = []

  constructor(
    groundPos: Position[],
    doorPos: Position[],
    listTile: Array<Array<boolean>>
  ) {
    this.agv = new Agv(0, 0, 0, 0, '', '', 0, 0)
    this.autoAgvs = []
    this.agents = []
    this.groundPos = groundPos
    this.doorPos = doorPos
    listTile.forEach((row) => {
      this.defaultListTile.push(row.map((tile) => null))
    })
    this.listTile = this.defaultListTile
  }

  public addGameObject(
    {
      x,
      y,
      width,
      height,
      serverId,
      gameObjectType,
      gameObjectAttrs,
      desX,
      desY,
      clientId,
    }: GameObject,
    socket: Socket
  ) {
    switch (gameObjectType) {
      case socketEvents.gameObjectType.agv:
        this.agv = new Agv(
          x,
          y,
          width,
          height,
          serverId,
          '',
          desX || 0,
          desY || 0
        )
        break
      case socketEvents.gameObjectType.autoAgv:
        this.autoAgvs.push(
          new AutoAgv(x, y, width, height, serverId, clientId || '')
        )
        break
      case socketEvents.gameObjectType.agent:
        if (gameObjectAttrs)
          this.agents.push(
            new Agent(
              x,
              y,
              width,
              height,
              serverId,
              gameObjectAttrs,
              this.groundPos,
              socket,
              clientId || ''
            )
          )
        break
      default:
    }
  }

  // agents can randomly disapear
  public deleteAgent(serverId: string) {
    let index = -1
    for (let i = 0; i < this.agents.length; i++) {
      if (this.agents[i].serverId === serverId) {
        index = i
        break
      }
    }

    if (index !== -1) this.agents.splice(index, 1)
  }

  public updateAllGameObjects(
    agvInfo: { x: number; y: number }[],
    autoAgvsInfo: { x: number; y: number; serverId: string }[],
    agentsInfo: { x: number; y: number; serverId: string }[]
  ) {
    this.agv.x = agvInfo[0].x
    this.agv.y = agvInfo[0].y

    this.listTile = this.defaultListTile
    this.listTile[Math.floor(this.agv.x / 32)][Math.floor(this.agv.y / 32)] =
      'agv'
    let i = 0
    autoAgvsInfo.forEach((info) => {
      const currentTmp = this.autoAgvs[i]
      currentTmp.x = info.x
      currentTmp.y = info.y
      currentTmp.serverId = info.serverId
      this.listTile[Math.floor(currentTmp.x / 32)][
        Math.floor(currentTmp.y / 32)
      ] = 'autoagv_' + currentTmp.serverId
      i++
    })

    i = 0
    agentsInfo.forEach((info) => {
      const currentTmp = this.agents[i]
      currentTmp.x = info.x
      currentTmp.y = info.y
      currentTmp.serverId = info.serverId
      this.listTile[Math.floor(currentTmp.x / 32)][
        Math.floor(currentTmp.y / 32)
      ] = 'agent_' + currentTmp.serverId
      i++
    })
  }
}
