import { Agent } from './Agent'
import { Agv } from './Agv'
import { AutoAgv } from './autoAgv'

var socketEvents = require('../socketEvents')

export class Player {
  public agv: Agv
  public autoAgvs: AutoAgv[]
  public agents: Agent[]

  constructor() {
    this.agv = new Agv(0, 0, 0, 0, '')
    this.autoAgvs = []
    this.agents = []
  }

  public addGameObject({
    x,
    y,
    width,
    height,
    serverId,
    gameObjectType,
  }: {
    x: number
    y: number
    width: number
    height: number
    serverId: string
    gameObjectType: string
  }) {
    switch (gameObjectType) {
      case socketEvents.gameObjectType.agv:
        this.agv = new Agv(x, y, width, height, serverId)
        break
      case socketEvents.gameObjectType.autoAgv:
        this.autoAgvs.push(new AutoAgv(x, y, width, height, serverId))
        break
      case socketEvents.gameObjectType.agent:
        this.agents.push(new Agent(x, y, width, height, serverId))
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

    let i = 0
    autoAgvsInfo.forEach((info) => {
      let currentTmp = this.autoAgvs[i]
      currentTmp.x = info.x
      currentTmp.y = info.y
      currentTmp.serverId = info.serverId
      i++
    })

    i = 0
    agentsInfo.forEach((info) => {
      let currentTmp = this.agents[i]
      currentTmp.x = info.x
      currentTmp.y = info.y
      currentTmp.serverId = info.serverId
      i++
    })
  }
}
