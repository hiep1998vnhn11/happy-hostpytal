import { Agent } from './Agent'
import { movingGameObject } from './movingGameObject'

export class Physic {
  constructor() {}

  // return a list (array) of overlapped agvs serverId with the list of agents
  public checkOverlap(
    agvs: movingGameObject[],
    agents: Agent[]
  ): {
    agvServerId: string
    overlappedAgents: { agentServerId: string }[]
  }[] {
    let overlappedAgvs: {
      agvServerId: string
      overlappedAgents: { agentServerId: string }[]
    }[] = []

    agvs.forEach((agv) => {
      let currentAgvOverlapped = false
      let overLappedAgents: { agentServerId: string }[] = []

      agents.forEach((agent) => {
        if (
          this.isOverLapped(
            {
              minAx: agv.x,
              minAy: agv.y,
              maxAx: agv.x + agv.sizeWidth,
              maxAy: agv.y + agv.sizeHeight,
            },
            {
              minBx: agent.x,
              minBy: agent.y,
              maxBx: agent.x + agent.sizeWidth,
              maxBy: agent.y + agent.sizeHeight,
            }
          )
        ) {
          currentAgvOverlapped = true
          overLappedAgents.push({ agentServerId: agent.serverId })
        }
      })

      if (currentAgvOverlapped) {
        overlappedAgvs.push({
          agvServerId: agv.serverId,
          overlappedAgents: overLappedAgents,
        })
      }
    })

    return overlappedAgvs
  }

  // check is overLapped box 1 and box 2
  private isOverLapped(
    {
      minAx,
      minAy,
      maxAx,
      maxAy,
    }: { minAx: number; minAy: number; maxAx: number; maxAy: number },
    {
      minBx,
      minBy,
      maxBx,
      maxBy,
    }: { minBx: number; minBy: number; maxBx: number; maxBy: number }
  ): boolean {
    // Check for the cases where the rectangles are definitely not intersecting.
    // If none of these cases are true then the rectangles must intersect. i.e.:

    let aLeftOfB = maxAx < minBx
    let aRightOfB = minAx > maxBx
    let aAboveB = minAy > maxBy
    let aBelowB = maxAy < minBy

    return !(aLeftOfB || aRightOfB || aAboveB || aBelowB)
  }
}
