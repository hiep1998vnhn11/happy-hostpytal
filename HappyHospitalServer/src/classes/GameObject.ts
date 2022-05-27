export enum GameObjectType {
  AGV = 'AGV',
  AUTOAGV = 'AUTOAGV',
  AGENT = 'AGENT',
}
export interface GameObject {
  x: number
  y: number
  width: number
  height: number
  serverId: string
  gameObjectType: GameObjectType
  gameObjectAttrs?: AgentObject | null
}

export interface AgentObject {
  id: number
  startPos: {
    x: number
    y: number
  }
  endPos: {
    x: number
    y: number
  }
}
