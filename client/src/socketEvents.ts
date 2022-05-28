import { ImportAgent } from './scenes/main'
export const events = {
  newClient: 'new-client',
  updateServerPlayerControl: 'update-server-player-control',
  sendGameObjectToServer: 'send-game-object-to-server',
  deleteAgentOnServer: 'delete-agent-on-server',
  updateGameObjectsOnServer: 'update-game-objects-on-server',
  tellClientMainAgvOverlapped: 'tell-client-main-agv-overlapped',
  tellClientAutoAgvsOverlapped: 'tell-client-auto-agvs-overlapped',
  tellClientLoadedDataFromVadere: 'tell-client-loaded-data-from-vadere',
  userLoadedDataFromVadere: 'user-loaded-data-from-vadere',

  sendAgentPathToClient: 'send-agent-path-to-client',
  tellClientAgentsOverlapped: 'tell-client-agents-overlapped',

  onClientLoadData: 'on-client-load-data',
  onClientSaveData: 'on-client-save-data',
  onChangeMaxAgent: 'on-change-max-agent',

  clientFinish: 'client-finish',
}

import { Agent } from './classes/agent'
import { io } from 'socket.io-client'
import { Agv } from './classes/agv'
import { AutoAgv } from './classes/AutoAgv'

const serverUrl = 'http://localhost:3009'
export const socket = io(serverUrl)
export const localSocketId = socket.id

// socket.on(events.sendClientPosition, (serverPlayersPos) => {
//     localPlayerPos = (Object.values(serverPlayersPos)[0]);        // test console log, currently there's only one player
//     playersPos = serverPlayersPos;
//     // console.log(localPlayerPos);
// });

// socket.on(events.sendClientVel, (serverPlayersVel) => {
//     localPlayerVel = (Object.values(serverPlayersVel)[0]);        // test console log, currently there's only one player
//     playersVel = serverPlayersVel;
//     // console.log(localPlayerPos);
// });

export const gameObjectType = {
  agv: 'AGV',
  autoAgv: 'AUTOAGV',
  agent: 'AGENT',
}

interface MovingGameObject {
  x: number
  y: number
  width: number
  height: number
  serverId: string
  gameObjectType: string
  gameObjectAttrs?: any
  desX?: number
  desY?: number
  clientId?: number
}

export function sendGameObjectToServer(movingGameObject: MovingGameObject) {
  socket.emit(events.sendGameObjectToServer, movingGameObject)
}

export function deleteAgentOnServer(serverId: string) {
  socket.emit(events.deleteAgentOnServer, serverId)
}

export function updateGameObjectsOnServer(
  agv: Agv,
  autoAgvs: Set<AutoAgv>,
  agents: Agent[]
) {
  const agvInfo = [{ x: agv.x, y: agv.y }]
  const autoAgvsInfo: { x: number; y: number; serverId: string }[] = []
  autoAgvs.forEach((item) => {
    autoAgvsInfo.push({ x: item.x, y: item.y, serverId: item.serverId })
  })

  const agentsInfo: { x: number; y: number; serverId: string }[] = []
  agents.forEach((item) => {
    agentsInfo.push({ x: item.x, y: item.y, serverId: item.serverId })
  })

  socket.emit(
    events.updateGameObjectsOnServer,
    agvInfo,
    autoAgvsInfo,
    agentsInfo
  )
}

export const userLoadedDataFromVadere = (importAgents: ImportAgent[]) => {
  socket.emit(events.userLoadedDataFromVadere, importAgents)
}
