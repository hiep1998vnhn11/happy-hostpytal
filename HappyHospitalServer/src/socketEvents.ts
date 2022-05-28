export const events = {
  newClient: 'new-client',
  disconnect: 'disconnect',
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

export const gameObjectType = {
  agv: 'AGV',
  autoAgv: 'AUTOAGV',
  agent: 'AGENT',
}

export interface movingGameObject {
  x: number
  y: number
  width: number
  height: number
  gameObjectType: string
}
