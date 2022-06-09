import { Actor } from './actor'
import { Position } from './position'
import { Text } from './text'
import uniqid from 'uniqid'
import * as socketEvents from '../socketEvents'
import { MainScene } from '../scenes'
import { calPathAstarGrid } from '../algorithm'

export class Agent extends Actor {
  private startPos: Position
  private endPos: Position
  private vertexs: Position[]
  private endText: Text
  private agentText: Text
  private id: number
  public isOverlap: boolean = false
  public speed: number = 38
  private activeTimer: number = 0
  private sizeWidth = 32
  private sizeHeight = 32
  public serverId: string
  public currentPos: Position
  public nextPos: Position | undefined = undefined

  constructor(
    scene: MainScene,
    startPos: Position,
    endPos: Position,
    id: number
  ) {
    super(scene, startPos.x * 32, startPos.y * 32, 'tiles_spr', 17)
    this.scene = scene
    this.startPos = startPos
    this.endPos = endPos
    this.vertexs = []
    this.id = id
    this.speed = Math.floor(Math.random() * (this.speed - 10)) + 10
    this.endText = new Text(
      this.scene,
      endPos.x * 32 + 6,
      endPos.y * 32,
      id.toString(),
      '28px'
    )
    this.agentText = new Text(
      this.scene,
      startPos.x * 32,
      startPos.y * 32 - 16,
      id.toString()
    )
    // PHYSICS
    this.getBody().setSize(31, 31)
    this.setOrigin(0, 0)

    this.serverId = uniqid()
    this.currentPos = this.startPos
    this.active = false

    // socket: send agents to server
    socketEvents.sendGameObjectToServer({
      x: this.x,
      y: this.y,
      width: this.sizeWidth,
      height: this.sizeHeight,
      serverId: this.serverId,
      gameObjectType: socketEvents.gameObjectType.agent,
      gameObjectAttrs: {
        id: this.id,
        startPos: this.startPos,
        endPos: this.endPos,
      },
      clientId: this.id,
      desX: this.endPos.x,
      desY: this.endPos.y,
    })
  }

  public complete() {
    this.agentText.setText('DONE')
    this.agentText.setFontSize(12)
    this.x = this.currentPos.x * 32
    this.y = this.currentPos.y * 32
    this.setVelocity(0, 0)
    this.eliminate()
  }

  public goToDestinationByVertexs() {
    this.agentText.setPosition(this.x, this.y - this.height * 0.5)
    this.setVelocity(0, 0)
    if (!this.active) {
      return
    }
    if (!this.nextPos) {
      this.complete()
      return
    }
    const agentName = 'agent_' + this.id

    if (
      Math.abs(this.nextPos.x * 32 - this.x) > 1 ||
      Math.abs(this.nextPos.y * 32 - this.y) > 1
    ) {
      const busyGridState = this.getSnene().getBusyGridState(
        this.nextPos.x,
        this.nextPos.y
      )
      if (busyGridState && busyGridState !== agentName) {
        const split = busyGridState.split('_')
        const object = split[0]
        if (object !== 'agent') {
          this.active = false
          return this.recalculatePath(
            this.currentPos.x,
            this.currentPos.y,
            this.nextPos
          )
        }
        const agentId = +split[1] || 0
        if (agentId > this.id) {
          this.handleOverlap()
          return
          // socketEvents.socket.emit(socketEvents.events.agentRequestNewPath, {
          //   id: this.serverId,
          //   currentPos: this.currentPos,
          //   endPos: this.endPos,
          // })
          // this.setVelocity(0, 0)
          // return
        } else {
          this.active = false
          return this.recalculatePath(
            this.currentPos.x,
            this.currentPos.y,
            this.nextPos
          )
        }
      }
      this.getSnene().physics.moveTo(
        this,
        this.nextPos.x * 32,
        this.nextPos.y * 32,
        this.speed
      )
    } else {
      this.getSnene().setBusyGridState(
        this.currentPos.x,
        this.currentPos.y,
        null
      )
      this.currentPos = this.nextPos
      this.nextPos = this.vertexs.pop()
      if (this.nextPos) {
        this.getSnene().setBusyGridState(
          this.nextPos.x,
          this.nextPos.y,
          agentName
        )
      }
    }
  }
  preUpdate(): void {
    // this.goToDestinationByVertexs()
    this.updatePre()
  }

  public getStartPos(): Position {
    return this.startPos
  }
  public getEndPos(): Position {
    return this.endPos
  }
  public getId(): number {
    return this.id
  }

  public eliminate() {
    this.getSnene().events.emit('destroyAgent', this)
    this.endText.destroy()
    this.agentText.destroy()
    this.destroy()
  }

  public pause() {
    this.setVelocity(0, 0)
    this.setActive(false)
  }
  public restart() {
    this.setActive(true)
  }

  public handleOverlap() {
    this.setVelocity(0, 0)
    this.setActive(false)
    if (this.activeTimer) clearTimeout(this.activeTimer)
    this.activeTimer = setTimeout(() => {
      this.setActive(true)
    }, 1000)
  }

  public setPath(path: Position[]) {
    if (!path.length) return this.complete()
    this.active = true
    this.vertexs = path
    this.nextPos = this.vertexs.pop()
  }

  recalculatePath(x: number, y: number, excludedPos: Position) {
    const clonePos = [...this.getSnene().groundPos].filter(
      (i) => i.x != excludedPos.x || i.y != excludedPos.y
    )
    this.vertexs = calPathAstarGrid(
      52,
      28,
      clonePos,
      new Position(x, y),
      this.endPos
    )
    this.active = true

    if (this.vertexs.length == 0) {
      return
    }
    this.agentText.setX(this.x)
    this.agentText.setY(this.y - 16)
    this.currentPos = this.vertexs.pop()!
    this.nextPos = this.currentPos
    this.getSnene().setBusyGridState(
      this.currentPos.x,
      this.currentPos.y,
      'agent_' + this.id
    )
  }

  updatePre() {
    if (!this.active) {
      return
    }
    const agentName = 'agent_' + this.id
    this.agentText.setPosition(this.x, this.y - this.height * 0.5)
    this.setVelocity(0, 0)
    if (
      this.nextPos &&
      Math.abs(this.nextPos.x * 32 - this.x) < 1 &&
      Math.abs(this.nextPos.y * 32 - this.y) < 1
    ) {
      if (this.currentPos)
        this.getSnene().setBusyGridState(
          this.currentPos.x,
          this.currentPos.y,
          null
        )
      this.currentPos = this.nextPos
      this.nextPos = this.vertexs.pop()
      if (!this.nextPos) return

      this.getSnene().setBusyGridState(
        this.currentPos.x,
        this.currentPos.y,
        agentName
      )
      if (!this.getSnene().getBusyGridState(this.nextPos.x, this.nextPos.y)) {
        this.getSnene().setBusyGridState(
          this.nextPos.x,
          this.nextPos.y,
          agentName
        )
      }
      return this.move()
    } else if (!this.nextPos) {
      this.getSnene().setBusyGridState(
        this.currentPos.x,
        this.currentPos.y,
        null
      )
      this.eliminate()
      return
    } else {
      const nextObjectName = this.getSnene().getBusyGridState(
        this.nextPos.x,
        this.nextPos.y
      )
      if (!nextObjectName) {
        this.getSnene().setBusyGridState(
          this.nextPos.x,
          this.nextPos.y,
          agentName
        )
        return
      }
      if (nextObjectName !== agentName) {
        const split = nextObjectName.split('_')
        const object = split[0]
        if (object !== 'agent') {
          return this.recalculatePath(
            this.currentPos.x,
            this.currentPos.y,
            this.nextPos
          )
        }
        const agentId = +split[1]
        if (agentId > this.id) {
          return this.handleOverlap()
        }
        return this.recalculatePath(
          this.currentPos.x,
          this.currentPos.y,
          this.nextPos
        )
      }
      this.move()
    }
  }
  move() {
    this.nextPos
      ? this.getSnene().physics.moveTo(
          this,
          this.nextPos.x * 32,
          this.nextPos.y * 32,
          this.speed
        )
      : this.complete()
  }
}
