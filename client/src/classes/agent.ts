import { Actor } from './actor'
import { Position } from './position'
import { Text } from './text'
import { Astar } from '../algorithm/AStarSearch'
import uniqid from 'uniqid'
import * as socketEvents from '../socketEvents'
import { MainScene } from '../scenes'

export class Agent extends Actor {
  private startPos: Position
  private endPos: Position
  private groundPos: Position[]
  private path?: Position[]
  private vertexs: Position[]
  private endText: Text
  private agentText: Text
  // private astar: Astar
  private next: number = 1
  private id: number
  public isOverlap: boolean = false
  public speed: number = 38
  private avoiding = false

  private overlapTimer: number = 0
  private activeTimer: number = 0

  private sizeWidth = 32
  private sizeHeight = 32

  public serverId: string

  private randX = Math.random() * 0.4 - 0.2
  private randY = Math.random() * 0.4 - 0.2

  constructor(
    scene: MainScene,
    startPos: Position,
    endPos: Position,
    groundPos: Position[],
    id: number
  ) {
    super(scene, startPos.x * 32, startPos.y * 32, 'tiles_spr', 17)
    this.startPos = startPos
    this.endPos = endPos
    this.groundPos = groundPos
    this.path = []
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
    this.scene.physics.add.overlap(this, this.endText, () => {
      console.log(this.endText.text)
    })
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
    })
  }

  public goToDestinationByVertexs() {
    if (!this.vertexs.length) return
    if (this.avoiding) return
    if (this.next == this.vertexs.length) {
      this.agentText.setText('DONE')
      this.agentText.setFontSize(12)
      this.agentText.setX(this.x - 1)
      this.x = this.vertexs[this.vertexs.length - 1].x * 32
      this.y = this.vertexs[this.vertexs.length - 1].y * 32
      this.setVelocity(0, 0)
      this.eliminate()
      return
    }
    if (!this.active || this.isOverlap) {
      this.setVelocity(0, 0)
      return
    }
    if (
      Math.abs(this.vertexs[this.next].x * 32 - this.x) > 1 ||
      Math.abs(this.vertexs[this.next].y * 32 - this.y) > 1
    ) {
      this.scene.physics.moveTo(
        this,
        this.vertexs[this.next].x * 32,
        this.vertexs[this.next].y * 32,
        this.speed
      )
      this.agentText.setX(this.x)
      this.agentText.setY(this.y - 16)
    } else {
      this.next++
    }
  }
  preUpdate(): void {
    this.goToDestinationByVertexs()
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
    this.scene.events.emit('destroyAgent', this)
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

  public handleOverlap(isStand = false) {
    if (this.isOverlap) return
    this.isOverlap = true
    if (this.overlapTimer) clearTimeout(this.overlapTimer)
    this.overlapTimer = setTimeout(() => {
      this.isOverlap = false
    }, 4000)
    if (isStand) {
      this.setVelocity(0, 0)
      this.setActive(false)
      if (this.activeTimer) clearTimeout(this.activeTimer)
      this.activeTimer = setTimeout(() => {
        this.setActive(true)
      }, 2000)
    }
  }

  // public handleAvoid(position: Position) {
  //   if (this.next == this.vertexs.length) {
  //     this.agentText.setText('DONE')
  //     this.agentText.setFontSize(12)
  //     this.agentText.setX(this.x - 1)
  //     this.x = this.vertexs[this.vertexs.length - 1].x * 32
  //     this.y = this.vertexs[this.vertexs.length - 1].y * 32
  //     this.setVelocity(0, 0)
  //     this.eliminate()
  //     return
  //   }
  //   if (this.next + 1 == this.vertexs.length) return
  //   const index = this.vertexs.findIndex(
  //     (vertex) => vertex.x === position.x && vertex.y === position.y
  //   )
  //   this.avoiding = true
  //   //When the barrier is not in the vertexs, continue to trajectory
  //   if (index === -1) return
  //   // this.scene.physics.moveTo(this, this.x + 32, this.y + 32, this.speed)

  //   const avoidingPosition = this.astar.getAvoidPath(
  //     position,
  //     this.vertexs[this.next + 1]
  //   )
  // }

  public setPath(path: Position[]) {
    this.next = 1
    this.vertexs = path || []
  }
}
