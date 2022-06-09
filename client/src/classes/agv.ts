import { Tilemaps } from 'phaser'
import { Actor } from './actor'
import { Text } from './text'
import * as socketEvents from '../socketEvents'
import { MainScene } from '../scenes'

export class Agv extends Actor {
  private text: Text
  private keyW: Phaser.Input.Keyboard.Key
  private keyA: Phaser.Input.Keyboard.Key
  private keyS: Phaser.Input.Keyboard.Key
  private keyD: Phaser.Input.Keyboard.Key
  private pathLayer: Tilemaps.TilemapLayer
  public isImmortal: boolean = false // biến cần cho xử lý overlap =))
  private isDisable: boolean = false // biến cần cho xử lý overlap =))
  private desX: number
  private desY: number
  private desText: Text
  private justPressed: number = 0
  private sizeWidth = 32
  private sizeHeight = 32
  public overlapCount = 0
  public startTime = 0
  public overing = false
  private playerControl = {
    t: true,
    l: true,
    b: true,
    r: true,
    keyW: false,
    keyA: false,
    keyS: false,
    keyD: false,
    action: 'hold', // hold, released
  }
  private isAgentOverlapsed = true
  private curTile: { x: number; y: number }

  constructor(
    scene: MainScene,
    x: number,
    y: number,
    desX: number,
    desY: number,
    pathLayer: Tilemaps.TilemapLayer
  ) {
    super(scene, x, y, 'agv')
    this.startTime = Date.now() / 1000
    this.desX = desX
    this.desY = desY
    this.pathLayer = pathLayer
    this.curTile = { x: x / 32, y: y / 32 }

    this.text = new Text(
      this.scene,
      this.x,
      this.y - this.height * 0.5,
      'AGV',
      '16px',
      '#00FF00'
    )
    this.desText = new Text(
      this.scene,
      this.desX,
      this.desY,
      'DES',
      '16px',
      '#00FF00'
    )
    // KEYS
    this.keyW = this.scene.input.keyboard.addKey('W')
    this.keyA = this.scene.input.keyboard.addKey('A')
    this.keyS = this.scene.input.keyboard.addKey('S')
    this.keyD = this.scene.input.keyboard.addKey('D')

    // PHYSICS
    this.getBody().setSize(32, 32)
    this.setOrigin(0, 0)

    this.estimateArrivalTime(x, y, desX, desY)

    // socket: send agv to server
    socketEvents.sendGameObjectToServer({
      x: this.x,
      y: this.y,
      width: this.sizeWidth,
      height: this.sizeHeight,
      serverId: '',
      gameObjectType: socketEvents.gameObjectType.agv,
      desX: this.desX,
      desY: this.desY,
    })
  }

  private getTilesWithin(): Tilemaps.Tile[] {
    return this.pathLayer.getTilesWithinWorldXY(this.x, this.y, 31, 31)
  }

  public ToastInvalidMove() {
    this.scene.rexUI.add
      .toast({
        x: 800,
        y: window.innerHeight - 55,
        orientation: 0,
        background: this.scene.rexUI.add.roundRectangle(
          0,
          0,
          2,
          2,
          20,
          0xffffff
        ),
        text: this.scene.add.text(0, 0, '', {
          fontSize: '24px',
          color: '#000000',
        }),
        space: {
          left: 10,
          right: 10,
          top: 10,
          bottom: 10,
        },
        duration: {
          in: 0,
          hold: 500,
          out: 0,
        },
      })
      .showMessage('Di chuyển không hợp lệ!')
  }

  public ToastOverLay() {
    this.scene.rexUI.add
      .toast({
        x: 800,
        y: window.innerHeight - 75,
        background: this.scene.rexUI.add.roundRectangle(
          0,
          0,
          2,
          2,
          20,
          0xffffff
        ),
        text: this.scene.add.text(0, 0, '', {
          fontSize: '24px',
          color: '#000000',
        }),
        space: {
          left: 10,
          right: 10,
          top: 10,
          bottom: 10,
        },
        duration: {
          in: 0,
          hold: 100,
          out: 0,
        },
      })
      .showMessage(
        this.isAgentOverlapsed
          ? 'AGV va chạm với Agent!'
          : 'AGV va chạm với Auto AGV!'
      )
  }

  public Toastcomplete() {
    this.isDisable = true
    const now = Date.now() / 1000
    this.scene.rexUI.add
      .toast({
        x: 800,
        y: window.innerHeight - 35,
        background: this.scene.rexUI.add.roundRectangle(
          0,
          0,
          2,
          2,
          20,
          0xffffff
        ),
        text: this.scene.add.text(0, 0, '', {
          fontSize: '24px',
          color: '#000000',
        }),
        space: {
          left: 10,
          right: 10,
          top: 10,
          bottom: 10,
        },
        duration: {
          in: 0,
          hold: 10000,
          out: 0,
        },
      })
      .showMessage(
        'Bạn đã di chuyển đến đích. Số lần va chạm: ' +
          this.overlapCount +
          ', Thời gian di chuyển: ' +
          Math.floor(now - this.startTime) +
          's'
      )
  }

  update(): void {
    this.getBody().setVelocity(0)
    this.text.setPosition(this.x, this.y - this.height * 0.5)
    if (this.isDisable) return

    // directions top, left, bottom, right
    let t, l, b, r
    t = true
    l = true
    b = true
    r = true

    this.playerControl.t = true
    this.playerControl.l = true
    this.playerControl.b = true
    this.playerControl.r = true

    const tiles = this.getTilesWithin()
    if (
      tiles.length == 1 &&
      (tiles[0].x != this.curTile.x || tiles[0].y != this.curTile.y)
    ) {
      this.getSnene().setBusyGridState(this.curTile.x, this.curTile.y, null)
      this.curTile = { x: tiles[0].x, y: tiles[0].y }
      this.getSnene().setBusyGridState(this.curTile.x, this.curTile.y, 'magv')
    }
    for (let i = 0; i < tiles.length; i++) {
      const objectName = this.getSnene().getBusyGridState(
        tiles[i].x,
        tiles[i].y
      )
      if (
        objectName &&
        this.getSnene().getBusyGridState(tiles[i].x, tiles[i].y) != 'magv'
      )
        return

      if (tiles[i].properties.direction == 'top') {
        b = false
        this.playerControl.b = false
        if (this.keyS?.isDown) {
          this.ToastInvalidMove()
        }
      }
      if (tiles[i].properties.direction == 'left') {
        r = false
        this.playerControl.r = false
        if (this.keyD?.isDown) {
          this.ToastInvalidMove()
        }
      }
      if (tiles[i].properties.direction == 'bottom') {
        t = false
        this.playerControl.t = false
        if (this.keyW?.isDown) {
          this.ToastInvalidMove()
        }
      }
      if (tiles[i].properties.direction == 'right') {
        l = false
        this.playerControl.l = false
        if (this.keyA?.isDown) {
          this.ToastInvalidMove()
        }
      }
    }

    if (this.keyW?.isDown) {
      this.playerControl.keyW = true
      this.justPressed > 500 ? (this.justPressed = 2) : this.justPressed++
      if (t) {
        this.body.velocity.y = -32
      }
    }

    if (this.keyA?.isDown) {
      this.playerControl.keyA = true
      this.justPressed > 500 ? (this.justPressed = 2) : this.justPressed++
      if (l) {
        this.body.velocity.x = -32
      }
    }

    if (this.keyS?.isDown) {
      this.playerControl.keyS = true
      this.justPressed > 500 ? (this.justPressed = 2) : this.justPressed++
      if (b) {
        this.body.velocity.y = 32
      }
    }

    if (this.keyD?.isDown) {
      this.playerControl.keyD = true
      this.justPressed > 500 ? (this.justPressed = 2) : this.justPressed++
      if (r) {
        this.body.velocity.x = 32
      }
    }

    // avoid emit socket at 60 frame per sec, which causes a lot of bandwidth
    if (this.justPressed == 1) {
      this.playerControl.action = 'hold'
      this.emitPlayerControl(this.playerControl)
    }

    if (this.playerControl.keyW && this.keyW?.isUp) {
      // just press W previously and release the key W --> no more pressing W
      this.playerControl.keyW = false
      this.playerControl.action = 'release'
      this.justPressed = 0
      this.emitPlayerControl(this.playerControl)
    }

    if (this.playerControl.keyA && this.keyA?.isUp) {
      this.playerControl.keyA = false
      this.playerControl.action = 'release'
      this.justPressed = 0
      this.emitPlayerControl(this.playerControl)
    }

    if (this.playerControl.keyS && this.keyS?.isUp) {
      this.playerControl.keyS = false
      this.playerControl.action = 'release'
      this.justPressed = 0
      this.emitPlayerControl(this.playerControl)
    }

    if (this.playerControl.keyD && this.keyD?.isUp) {
      this.playerControl.keyD = false
      this.playerControl.action = 'release'
      this.justPressed = 0
      this.emitPlayerControl(this.playerControl)
    }
  }

  private emitPlayerControl(playerControl: any) {
    const tmp = {
      t: playerControl?.t,
      l: playerControl?.l,
      b: playerControl?.b,
      r: playerControl?.r,
      keyW: playerControl?.keyW,
      keyA: playerControl?.keyA,
      keyS: playerControl?.keyS,
      keyD: playerControl?.keyD,
      action: playerControl?.action,
    }

    socketEvents.socket.emit(socketEvents.events.updateServerPlayerControl, tmp)
  }

  public handleOverlap(isAgent = true) {
    if (isAgent) {
      this.isAgentOverlapsed = true
      this.overlapCount++
    } else this.isAgentOverlapsed = false
    this.ToastOverLay()
    if (!this.isImmortal) {
      this.isDisable = true
      setTimeout(() => {
        this.isImmortal = true
        this.isDisable = false
        setTimeout(() => {
          this.isImmortal = false
        }, 2000)
      }, 1000)
    }
  }
}
