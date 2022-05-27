import { Position } from './classes copy/position'
import { Socket } from 'socket.io'
import { Player } from './classes/Player'
import { Physic } from './classes/Physic'
import * as socketEvents from './socketEvents'
import express from 'express'
import cors from 'cors'
import { GameObject } from './classes/GameObject'

const app = express()

const server = require('http').Server(app)
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
  },
})
server.listen(3009)

app.use(
  cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  })
)

const players: Record<string, Player> = {} // currenlty there's only one socket-player
const physicObject = new Physic()

let overlappedAgv: {
  agvServerId: string
  overlappedAgents: { agentServerId: string }[]
}[] = []

let overlappedAutoAgvs: {
  agvServerId: string
  overlappedAgents: { agentServerId: string }[]
}[] = []

io.on('connection', (socket: Socket) => {
  socket.on(
    socketEvents.events.newClient,
    ({
      groundPos,
      doorPos,
    }: {
      groundPos: Position[]
      doorPos: Position[]
    }) => {
      console.log('new client connected!, with id: ', socket.id)
      players[socket.id] = new Player(groundPos, doorPos)
    }
  )

  socket.on(socketEvents.events.disconnect, () => {
    delete players[socket.id]
    console.log('client ' + socket.id + ' disconnected!')
  })

  socket.on(socketEvents.events.updateServerPlayerControl, (userCommand) => {
    console.log(userCommand)
    // players[socket.id].updateControl(userCommand);
  })

  socket.on(socketEvents.events.userLoadedDataFromVadere, (importAgents) => {
    console.log('User upload from vadere!')
    //
    console.table(importAgents)
    socket.emit(
      socketEvents.events.tellClientLoadedDataFromVadere,
      importAgents
    )
    // players[socket.id].updateControl(userCommand);
  })

  socket.on(
    socketEvents.events.sendGameObjectToServer,
    (gameObject: GameObject) => {
      if (!players[socket.id]) return
      players[socket.id].addGameObject(gameObject, socket)
    }
  )

  socket.on(socketEvents.events.deleteAgentOnServer, (serverId: string) => {
    if (!players[socket.id]) return

    players[socket.id].deleteAgent(serverId)
  })

  socket.on(
    socketEvents.events.updateGameObjectsOnServer,
    (
      agvInfo: { x: number; y: number }[],
      autoAgvsInfo: { x: number; y: number; serverId: string }[],
      agentsInfo: { x: number; y: number; serverId: string }[]
    ) => {
      if (!players[socket.id]) return
      players[socket.id].updateAllGameObjects(agvInfo, autoAgvsInfo, agentsInfo)

      // check collide list of agvs with agents (only one main agv -- the player)
      overlappedAgv = physicObject.checkOverlap(
        [players[socket.id].agv],
        players[socket.id].agents
      )
      if (overlappedAgv.length !== 0) {
        // console.log("main player overlapped with agents!");
        socket.emit(
          socketEvents.events.tellClientMainAgvOverlapped,
          overlappedAgv
        )
      }

      // check collide list of auto agvs with agents
      overlappedAutoAgvs = physicObject.checkOverlap(
        players[socket.id].autoAgvs,
        players[socket.id].agents
      )
      if (overlappedAutoAgvs.length !== 0) {
        // console.log("some auto agvs overlapped with agents!");
        socket.emit(
          socketEvents.events.tellClientAutoAgvsOverlapped,
          overlappedAutoAgvs
        )
      }

      // console.log(JSON.stringify(overlappedAgv))
      // console.log(JSON.stringify(overlappedAutoAgvs));  // test player overlapped
    }
  )
})

// setInterval(serverLoop, 1000/60);

// function serverLoop () {
//   // convert user command to velocity and new position of "all" players
//   for (const socketId in players) {
//     let player = players[socketId];
//     player.update();

//     // playersPos[socketId].x = player.x;
//     // playersPos[socketId].y = player.y;
//     playersVel[socketId].velX = player.velX;
//     playersVel[socketId].velY = player.velY;
//   }

//   console.log(playersPos);

//   // emit position to "all" socket of "all" players in every frame
//   io.emit(socketEvents.events.sendClientPosition, playersPos);
//   io.emit(socketEvents.events.sendClientVel, playersVel);
// }
