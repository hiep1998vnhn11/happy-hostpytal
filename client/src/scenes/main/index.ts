import { Scene, Tilemaps } from 'phaser'
import { Agv } from '../../classes/agv'
import { Agent } from '../../classes/agent'
import { Position } from '../../classes/position'
import { AutoAgv, AutoAgvJSON } from '../../classes/AutoAgv'
import { Graph } from '../../classes/graph'
import { RandomDistribution } from '../../algorithm/random'
import { Constant, ModeOfPathPlanning, MODE } from '../../Constant'
import { EmergencyGraph } from '../../classes/emergencyGraph'
import { Forcasting } from '../../classes/statistic/forcasting'
import * as socketEvents from '../../socketEvents'

export interface ImportAgent {
  id?: number
  startPos: {
    x: number
    y: number
  }
  endPos: {
    x: number
    y: number
  }
}
interface InitData {
  agents?: ImportAgent[]
  agv?: Agv
  _harmfullness?: number
  sec?: number
  timeTableText?: string
  autoAgvs?: AutoAgvJSON[]
}
export class MainScene extends Scene {
  static readonly AGV_START_X = 1
  static readonly AGV_START_Y = 14
  static readonly AUTO_AGV_START_Y = 13
  static readonly AUTO_AGV_START_X = 1
  static readonly EXIT_X = 50
  static readonly EXIT_Y = [13, 14]

  private agv!: Agv
  public autoAgvs!: Set<AutoAgv>
  private map!: Tilemaps.Tilemap
  private tileset!: Tilemaps.Tileset
  private groundLayer!: Tilemaps.TilemapLayer
  private elevatorLayer!: Tilemaps.TilemapLayer
  private roomLayer!: Tilemaps.TilemapLayer
  private gateLayer!: Tilemaps.TilemapLayer
  private wallLayer!: Tilemaps.TilemapLayer
  private doorLayer!: Tilemaps.TilemapLayer
  private pathLayer!: Tilemaps.TilemapLayer
  private noPathLayer!: Tilemaps.TilemapLayer
  private bedLayer!: Tilemaps.TilemapLayer
  public groundPos!: Position[]
  public pathPos!: Position[]
  private listTile: Position[][][]
  private saveButton?: Phaser.GameObjects.Text
  private loadButton?: Phaser.GameObjects.Text
  private loadVadereButton?: Phaser.GameObjects.Text
  private mapData: InitData = {}
  private spaceGraph?: Graph
  private emergencyGraph?: EmergencyGraph
  public doorPos: Position[]
  private timeText?: Phaser.GameObjects.Text
  public sec: number = 0
  public timeTable?: Phaser.GameObjects.Text
  private harmfulTable?: Phaser.GameObjects.Text
  private harmfulTableText?: Phaser.GameObjects.Text
  private _harmfullness: number = 0
  private agents!: Agent[]
  private rememberAgents: ImportAgent[] = []
  private MAX_AGENT: number = 10
  private desDom?: Phaser.GameObjects.DOMElement
  public mapOfExits: Map<string, number[]> = new Map([
    ['Gate1', [MainScene.EXIT_X, MainScene.EXIT_Y[0], 0]],
    ['Gate2', [MainScene.EXIT_X, MainScene.EXIT_Y[1], 0]],
  ])
  public count: number = 0
  public forcasting?: Forcasting
  public busyGrid: Record<number, Record<number, string | null>> = {}

  public getMainAgv(): Agv {
    return this.agv
  }

  public setBusyGridState(x: number, y: number, state: string | null) {
    if (!x || !y) return
    if (
      x === MainScene.EXIT_X &&
      (y === MainScene.EXIT_Y[0] || y === MainScene.EXIT_Y[1])
    )
      return
    if (!this.busyGrid[x]) this.busyGrid[x] = {}
    this.busyGrid[x][y] = state
  }
  getBusyGridState(x: number, y: number) {
    return this.busyGrid[x]?.[y] || null
  }

  constructor() {
    super('main-scene')
    this.agents = new Array()
    this.groundPos = new Array()
    this.pathPos = new Array()
    this.listTile = new Array(52)
    this.doorPos = new Array()
    this.autoAgvs = new Set()
    this.forcasting = new Forcasting()
    for (let i = 0; i < this.listTile.length; i++) {
      this.listTile[i] = new Array(28)
      for (let j = 0; j < this.listTile[i].length; j++) {
        this.listTile[i][j] = []
      }
    }
  }

  preload(): void {
    this.load.baseURL = 'assets/'
    this.load.image({
      key: 'tiles',
      url: 'tilemaps/tiles/hospital.png',
    })
    this.load.tilemapTiledJSON('hospital', 'tilemaps/json/hospital.json')
    this.load.image('agv', 'sprites/agv.png')
    this.load.spritesheet('tiles_spr', 'tilemaps/tiles/hospital.png', {
      frameWidth: 32,
      frameHeight: 32,
    })
    this.load.image('instruction', 'sprites/instruction.png')
    this.load.html('setNumAgentForm', 'setNumAgents.html')
    this.load.html('setAlgorithm', 'setAlgorithm.html')
    this.load.html('des', 'des.html')
  }

  create(): void {
    this.initMap()
    this.initTileMap()
    socketEvents.socket.emit(socketEvents.events.newClient, {
      groundPos: this.groundPos,
      doorPos: this.doorPos,
      listTile: this.listTile,
      pathPos: this.pathPos,
    }) // vi du ket noi client va socket

    // init Graph

    this.desDom = this.add.dom(1790, 600).createFromCache('des')
    this.desDom.setPerspective(800)

    let r = Math.floor(Math.random() * this.pathPos.length)
    while (
      !Constant.validDestination(this.pathPos[r].x, this.pathPos[r].y, 1, 14)
    ) {
      r = Math.floor(Math.random() * this.pathPos.length)
    }
    this.agv = new Agv(
      this,
      1 * 32,
      14 * 32,
      this.pathPos[r].x * 32,
      this.pathPos[r].y * 32,
      this.pathLayer
    )
    this.agv.setPushable(false)
    this.addButton()
    this.timeTable && this.agv.writeDeadline(this.timeTable)
    const des = document.getElementById('des')
    if (des) {
      while (des.childNodes.length >= 1) {
        des.firstChild && des.removeChild(des.firstChild)
      }
      des.appendChild(
        des.ownerDocument.createTextNode(this.timeTable?.text || '')
      )
    }
    this.createRandomAutoAgv()
    this.events.on('destroyAgent', this.destroyAgentHandler, this)
    this.createAgents(this.MAX_AGENT, 1000)
    this.physics.add.collider(this.agv, this.noPathLayer)
    this.openLinkInstruction()

    setInterval(() => {
      this.sec++
      this.timeText?.setText(Constant.secondsToHMS(this.sec))
    }, 1000)

    const setNumAgentsDOM = this.add
      .dom(window.innerWidth - 130, 240)
      .createFromCache('setNumAgentForm')
    const setAlgorithm = this.add
      .dom(window.innerWidth - 130, 25)
      .createFromCache('setAlgorithm')
      .setPerspective(800)

    setNumAgentsDOM.setPerspective(800)
    setNumAgentsDOM.addListener('click')
    setNumAgentsDOM.on('click', function (this: any, event: any) {
      if (event.target.id === 'submit') {
        let input = this.getChildByName('numOfAgents')
        let numAgent = parseInt(input.value)
        if (!isNaN(numAgent) && numAgent > 0) {
          socketEvents.socket.emit(
            socketEvents.events.onChangeMaxAgent,
            numAgent
          )
          this.scene.setMaxAgents(numAgent)
        }
      }
    })
    const selectAgmOption = setAlgorithm.getChildByID(
      'select-agm'
    ) as HTMLOptionElement
    if (selectAgmOption) {
      selectAgmOption.addEventListener('change', () => {
        socketEvents.socket.emit(
          socketEvents.events.onClientChangeAgvAlgorithm,
          selectAgmOption.value
        )
        // Constant.changeMode(
        //   selectAgmOption.value === 'FRANSEN'
        //     ? ModeOfPathPlanning.FRANSEN
        //     : ModeOfPathPlanning.PROPOSE
        // )
        alert('Đã đổi thuật toán thành công!')
      })
    }
    this.spaceGraph = new Graph(52, 28, this.listTile, this.pathPos)
    this.emergencyGraph = new EmergencyGraph(
      52,
      28,
      this.listTile,
      this.pathPos
    )
    console.log(
      Constant.numberOfEdges(52, 28, this.emergencyGraph.nodes),
      Constant.numberOfEdges(52, 28, this.emergencyGraph.virtualNodes)
    )
    console.log(Constant.numberOfEdges(52, 28, this.graph.nodes))
    const numOfRealEdges = Constant.numberOfEdges(52, 28, this.graph.nodes)
    const numOfAllEdges =
      Constant.numberOfEdges(52, 28, this.emergencyGraph.nodes) +
      Constant.numberOfEdges(52, 28, this.emergencyGraph.virtualNodes)
    console.log(
      'NumOfAllEdges ' +
        numOfAllEdges +
        ' as well as #RealEdges: ' +
        numOfRealEdges
    )
    console.assert(
      numOfAllEdges == 4 * numOfRealEdges,
      'NumOfAllEdges ' +
        numOfAllEdges +
        ' != 4 times #RealEdges: ' +
        numOfRealEdges
    )

    // socket: send agv, autoAgvs, agents position to the server each 500ms
    setInterval(() => {
      socketEvents.updateGameObjectsOnServer(
        this.agv,
        this.autoAgvs,
        this.agents
      )
    }, 500)

    socketEvents.socket.on(
      socketEvents.events.tellClientMainAgvOverlapped,
      (
        overlappedAgv: {
          agvServerId: string
          overlappedAgents: { agentServerId: string }[]
        }[]
      ) => {
        // agent handle overlapped with agv
        const overlappedAgents = overlappedAgv[0].overlappedAgents

        this.agents.forEach((el) => {
          for (let i = 0; i < overlappedAgents.length; i++) {
            // find which agents are overlapped
            if (el.serverId === overlappedAgents[i].agentServerId) {
              el.handleOverlap()
              break
            }
          }
        })
        // agv handle overlapped
        this.agv.handleOverlap()
      }
    )

    socketEvents.socket.on(
      socketEvents.events.tellClientAutoAgvsOverlapped,
      (
        overlappedAutoAgvs: {
          agvServerId: string
          overlappedAgents: { agentServerId: string }[]
        }[]
      ) => {
        this.autoAgvs.forEach((autoAgv) => {
          for (let i = 0; i < overlappedAutoAgvs.length; i++) {
            if (autoAgv.serverId === overlappedAutoAgvs[i].agvServerId) {
              const overlappedAgents = overlappedAutoAgvs[i].overlappedAgents
              this.agents.forEach((agent) => {
                const index = overlappedAgents.findIndex(
                  (el) => el.agentServerId === agent.serverId
                )
                if (index !== -1) autoAgv.freeze(agent)
              })
              break
            }
          }
        })
      }
    )
    socketEvents.socket.on(
      socketEvents.events.tellClientAgentsOverlapped,
      (serverId) => {
        const agent = this.agents.find((a) => a.serverId === serverId)
        if (agent) agent.handleOverlap()
      }
    )
    socketEvents.socket.on(
      socketEvents.events.tellClientLoadedDataFromVadere,
      (importAgents: ImportAgent[]) => {
        importAgents.forEach((agent) => {
          this.addAgent(agent)
        })
      }
    )

    socketEvents.socket.on(
      socketEvents.events.sendAgentPathToClient,
      ({
        vertexs,
        id,
        end,
      }: {
        id: number
        vertexs: Position[]
        end?: boolean
      }) => {
        const index = this.agents.findIndex((agent) => agent.getId() === id)
        if (index !== -1) {
          if (end) {
            this.agents[index].complete()
          } else this.agents[index].setPath(vertexs)
        }
      }
    )

    socketEvents.socket.on(socketEvents.events.clientFinish, () => {
      this.agv.Toastcomplete()
    })
  }

  public setMaxAgents(num: number): void {
    this.MAX_AGENT = num
    alert('Thiết lập số Agents thành công!')
  }
  public get harmfullness(): number {
    return this._harmfullness
  }
  public static formatHarmfullness(harmfullness: number): string {
    let text = harmfullness.toFixed(3).replace(/\d(?=(\d{3})+\.)/g, '$&,')

    if (text.length < 9) {
      const count = 9 - text.length
      for (let i = 0; i < count; i++) {
        text = ' ' + text
      }
    }
    return text
  }
  public set harmfullness(value: number) {
    this._harmfullness = value
    this.harmfulTable?.setText(
      'H.ness: ' + MainScene.formatHarmfullness(this._harmfullness)
    )
  }
  createAgents(numAgentInit: number, time: number) {
    // khoi tao numAgentInit dau tien
    const randoms = []
    while (randoms.length < numAgentInit * 2) {
      var r = Math.floor(Math.random() * this.doorPos.length)
      if (randoms.indexOf(r) === -1) randoms.push(r)
    }
    if (this.agents.length) {
      this.agents.forEach((agent) => {
        agent.eliminate()
      })
      this.agents = []
    }
    for (let i = 0; i < numAgentInit; i++) {
      this.addAgent({
        startPos: this.doorPos[randoms[i]],
        endPos: this.doorPos[randoms[i + numAgentInit]],
        id: Math.floor(Math.random() * 100),
      })
    }
    // thêm ngẫu nhiên agent vào môi trường
    setInterval(() => {
      const random = Math.random()
      if (this.rememberAgents.length && random > 0.3) {
        const index = Math.floor(Math.random() * this.rememberAgents.length)
        const agent = this.rememberAgents[index]
        this.rememberAgents.splice(index, 1)
        const startPos = agent.endPos
        const rand = new RandomDistribution()
        const ran = rand.getProbability()
        if (ran > 0.37) return
        const r = Math.floor(Math.random() * this.doorPos.length)
        this.addAgent({
          startPos,
          endPos: this.doorPos[r],
          id: agent.id,
        })
      } else {
        if (this.agents.length >= this.MAX_AGENT) return
        // Add Agent
        const rand = new RandomDistribution()
        const ran = rand.getProbability()
        if (ran > 0.37) return
        const r1 = Math.floor(Math.random() * this.doorPos.length)
        const r2 = Math.floor(Math.random() * this.doorPos.length)
        this.addAgent({
          startPos: this.doorPos[r1],
          endPos: this.doorPos[r2],
        })
      }

      this.count++
      if (this.count == 2) {
        this.autoAgvs.size < this.MAX_AGENT && this.createRandomAutoAgv()
        this.count = 0
      }
    }, time)
  }
  private addAgent(importAgent: ImportAgent) {
    const id = Math.floor(importAgent.id || Math.random() * 100)
    const index = this.agents.findIndex((agent) => agent.getId() === id)
    if (index !== -1) {
      this.agents[index].eliminate()
    }
    const startPos = new Position(
      Math.floor(importAgent.startPos.x),
      Math.floor(importAgent.startPos.y)
    )
    const endPos = new Position(
      Math.floor(importAgent.endPos.x),
      Math.floor(importAgent.endPos.y)
    )
    if (!startPos.validAgent() || !endPos.validAgent()) return
    const agent = new Agent(this, startPos, endPos, id)
    agent.setPushable(false)
    this.physics.add.collider(agent, this.roomLayer)
    this.agents.push(agent)
    this.graph?.setAgents(this.agents)
  }

  private destroyAgentHandler(agent: Agent) {
    const x = agent.getEndPos().x
    const y = agent.getEndPos().y
    if (
      (x === 1 && y === 1) ||
      (x === 50 && y === 1) ||
      (x === 1 && y === 26) ||
      (x === 50 && y === 26)
    ) {
    } else {
      this.rememberAgents.push({
        startPos: agent.getStartPos(),
        endPos: agent.getEndPos(),
        id: agent.getId(),
      })
    }
    this.agents = this.agents.filter((ag) => ag.getId() !== agent.getId())
    this.graph?.removeAgent(agent)
    this.autoAgvs.forEach((elem) => {
      if (elem.collidedActors.has(agent)) {
        elem.collidedActors.delete(agent)
      }
    })
    socketEvents.socket.emit(socketEvents.events.deleteAgentOnServer, {
      clientId: agent.getId(),
      serverId: agent.serverId,
    })
  }

  addButton(): void {
    this.saveButton = this.add.text(window.innerWidth - 250, 50, 'Save data', {
      backgroundColor: '#eee',
      padding: { bottom: 5, top: 5, left: 60, right: 10 },
      color: '#000',
      fontSize: '22px',
      fontStyle: 'bold',
      fixedWidth: 240,
    })
    this.loadButton = this.add.text(window.innerWidth - 250, 90, 'Load data', {
      backgroundColor: '#eee',
      padding: { bottom: 5, top: 5, left: 60, right: 10 },
      color: '#000',
      fontSize: '24px',
      fixedWidth: 240,
      fontStyle: 'bold',
    })
    this.loadVadereButton = this.add.text(
      window.innerWidth - 250,
      140,
      'Load data from Vadere',
      {
        fixedWidth: 240,
        backgroundColor: '#eee',
        padding: { bottom: 5, top: 10, left: 10, right: 10 },
        color: '#000',
        fontSize: '17px',
        fontStyle: 'bold',
        align: 'left',
        fixedHeight: 35,
      }
    )

    this.saveButton
      .setInteractive()
      .on('pointerdown', () => this.handleClickSaveButton())
    this.loadButton
      .setInteractive()
      .on('pointerdown', () => this.handleClickLoadButton())
    this.loadVadereButton
      .setInteractive()
      .on('pointerdown', () => this.handleClickLoadVadereButton())

    this.timeText = this.add.text(window.innerWidth - 190, 290, '00:00:00', {
      color: '#D8202A',
      fontSize: '28px',
      fontStyle: 'bold',
    })

    this.timeTable = this.add.text(window.innerWidth - 1910, 870, '', {
      color: '#D8202A',
      fontSize: '28px',
      fontStyle: 'bold',
    })
    this.timeTable.setVisible(false)

    this.harmfulTable = this.add.text(
      window.innerWidth - 200,
      330,
      '  H.ness: \n   0.000',
      {
        color: '#D8202A',
        fontSize: '22px',
        fontStyle: 'bold',
        fixedWidth: 200,
        wordWrap: { width: 180 },
      }
    )
  }

  openLinkInstruction() {
    const instruction = this.add
      .image(window.innerWidth - 125, window.innerHeight - 90, 'instruction')
      .setInteractive()
    instruction.on('pointerup', () => {
      window.open(
        'https://github.com/phamtuanhien/Project20211_HappyHospital#readme'
      )
    })
  }

  update(): void {
    this.graph?.updateState()
    this.agv.update()
    this.forcasting?.calculate()
  }

  private handleClickSaveButton() {
    alert('Đã lưu map thành công!')
    this.mapData = {}
    this.mapData.agv = this.agv
    this.mapData._harmfullness = this._harmfullness
    this.mapData.timeTableText = this.timeTable?.text
    this.mapData.sec = this.sec
    this.mapData.autoAgvs = Array.from(this.autoAgvs).map((autoAgv) =>
      autoAgv.toJson()
    )
    const saveAgents = []
    for (let i = 0; i < this.agents.length; i++) {
      saveAgents.push({
        startPos: {
          x: this.agents[i].getStartPos().x,
          y: this.agents[i].getStartPos().y,
        },
        endPos: {
          x: this.agents[i].getEndPos().x,
          y: this.agents[i].getEndPos().y,
        },
        id: this.agents[i].getId(),
      })
    }
    this.mapData.agents = saveAgents

    const objJSON = JSON.stringify(this.mapData, undefined, 2)
    const text = objJSON
    const e = document.createElement('a')
    e.setAttribute(
      'href',
      // "data:text/plain;charset=utf-8," + encodeURIComponent(text)
      'data:text/plain;charset=utf-8,' + text
    )
    e.setAttribute('download', 'save.json')
    e.style.display = 'none'
    document.body.appendChild(e)
    e.click()
    document.body.removeChild(e)
    socketEvents.socket.emit(socketEvents.events.onClientSaveData, this.mapData)
    // console.log(text);
  }
  private handleClickLoadButton() {
    const e = document.createElement('input')
    const reader = new FileReader()
    const openFile = (event: any) => {
      var input = event.target
      var fileTypes = 'json'
      if (input.files && input.files[0]) {
        var extension = input.files[0].name.split('.').pop().toLowerCase(),
          isSuccess = fileTypes.indexOf(extension) > -1

        if (isSuccess) {
          reader.onload = () => {
            if (typeof reader?.result == 'string') {
              this.mapData = JSON.parse(reader.result)
              this.autoAgvs.forEach((agv) => agv.eliminate())
              this.autoAgvs = new Set()
              if (this.timeTable && this.mapData.timeTableText)
                this.timeTable.text = this.mapData.timeTableText
              if (this.mapData.sec) {
                this.sec = this.mapData.sec
              }
              if (this.harmfulTable && this.mapData._harmfullness) {
                this.harmfulTable.setText(
                  '  H.ness: \n' +
                    MainScene.formatHarmfullness(this.mapData._harmfullness)
                )
                this._harmfullness = this.mapData._harmfullness
              }
              if (this.mapData.agv) {
                this.agv.setX(this.mapData.agv.x)
                this.agv.setY(this.mapData.agv.y)
              }
              if (this.mapData.autoAgvs && this.mapData.autoAgvs.length > 0) {
                this.mapData.autoAgvs.forEach((agv) => {
                  new AutoAgv(
                    this,
                    Math.floor(agv.x / 32),
                    Math.floor(agv.y / 32),
                    agv.endX / 32,
                    agv.endY / 32,
                    this.graph
                  )
                })
              }
              if (this.mapData.agents && this.mapData.agents.length > 0) {
                this.mapData.agents?.forEach((agent) => {
                  this.addAgent(agent)
                })
              } else {
                this.agents.forEach((agent) => {
                  agent.eliminate()
                })
              }
              socketEvents.socket.emit(
                socketEvents.events.onClientLoadData,
                this.mapData
              )
              alert('Đã tải map thành công!')
            }
          }
          reader.readAsText(input.files[0])
        } else {
          alert('File không đúng định dạng. Vui lòng chọn file .json!')
        }
      }
    }
    e.type = 'file'
    e.style.display = 'none'
    e.addEventListener('change', openFile, false)
    document.body.appendChild(e)
    e.click()
    document.body.removeChild(e)
  }

  private readVadereData(content: string): Record<string, string>[] | null {
    const data: Record<string, string>[] = []
    const lines = content.split('\n')
    const keys = lines[0].split(' ').filter((key) => key.trim() !== '')
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (line.trim() !== '') {
        const lineData = line.split(' ').filter((key) => key.trim() !== '')
        if (lineData.length !== keys.length) {
          alert('Dữ liệu không đúng định dạng! Hãy kiểm tra dòng ' + (i + 1))
          return null
        }
        const record: Record<string, string> = {}
        for (let j = 0; j < lineData.length; j++) {
          record[keys[j]] = lineData[j]
        }
        data.push(record)
      }
    }
    return data
  }

  private handleClickLoadVadereButton() {
    const e = document.createElement('input')
    const reader = new FileReader()
    const openFile = (event: any) => {
      var input = event.target
      var fileTypes = 'txt'
      var isSuccess = false
      if (input.files && input.files[0]) {
        var extension = input.files[0].name.split('.').pop().toLowerCase(),
          isSuccess = fileTypes.indexOf(extension) > -1

        if (isSuccess) {
          reader.onload = () => {
            if (typeof reader.result == 'string') {
              const data = this.readVadereData(reader.result)
              if (data) {
                const agentDicts = data.reduce((acc, cur) => {
                  if (acc[cur.pedestrianId]) {
                    acc[cur.pedestrianId].push(cur)
                  } else {
                    acc[cur.pedestrianId] = [cur]
                  }
                  return acc
                }, {} as Record<string, any[]>)
                const importAgents: ImportAgent[] = Object.entries(
                  agentDicts
                ).map(([id, records]) => {
                  const agent = {
                    id: +id,
                    startPos: {
                      x: +records[0]['startX-PID1'],
                      y: +records[0]['startY-PID1'],
                    },
                    endPos: {
                      x: +records[records.length - 1]['endX-PID1'],
                      y: +records[records.length - 1]['endY-PID1'],
                    },
                  }
                  return agent
                })
                socketEvents.userLoadedDataFromVadere(importAgents)
              }
            }
          }
          reader.readAsText(input.files[0])
        } else {
          alert('File không đúng định dạng. Vui lòng chọn file .txt!')
        }
      }
    }
    e.type = 'file'
    e.style.display = 'none'
    e.addEventListener('change', openFile, false)
    document.body.appendChild(e)
    e.click()
    document.body.removeChild(e)
  }

  private initMap(): void {
    this.map = this.make.tilemap({
      key: 'hospital',
      tileHeight: 32,
      tileWidth: 32,
    })
    this.tileset = this.map.addTilesetImage('hospital', 'tiles')
    this.noPathLayer = this.map.createLayer('nopath', this.tileset, 0, 0)
    this.groundLayer = this.map.createLayer('ground', this.tileset, 0, 0)
    this.roomLayer = this.map.createLayer('room', this.tileset, 0, 0)
    this.wallLayer = this.map.createLayer('wall', this.tileset, 0, 0)
    this.pathLayer = this.map.createLayer('path', this.tileset, 0, 0)
    this.doorLayer = this.map.createLayer('door', this.tileset, 0, 0)
    this.elevatorLayer = this.map.createLayer('elevator', this.tileset, 0, 0)
    this.gateLayer = this.map.createLayer('gate', this.tileset, 0, 0)
    this.bedLayer = this.map.createLayer('bed', this.tileset, 0, 0)

    this.noPathLayer.setCollisionByProperty({ collides: true })
    this.roomLayer.setCollisionByProperty({ collides: true })

    this.physics.world.setBounds(
      0,
      0,
      this.groundLayer.width,
      this.groundLayer.height
    )

    this.groundLayer
      .getTilesWithin()
      .filter((v) => v.index != -1)
      .forEach((v) => {
        const pos: Position = new Position(v.x, v.y)
        this.groundPos.push(pos)
      })

    this.pathLayer
      .getTilesWithin()
      .filter((v) => v.index != -1)
      .forEach((v) => {
        const pos: Position = new Position(v.x, v.y)
        this.pathPos.push(pos)
      })

    this.doorLayer
      .getTilesWithin()
      .filter((v) => v.index != -1)
      .forEach((v) => {
        const pos: Position = new Position(v.x, v.y)
        this.doorPos.push(pos)
      })

    this.gateLayer
      .getTilesWithin()
      .filter((v) => v.index != -1)
      .forEach((v) => {
        const pos: Position = new Position(v.x, v.y)
        this.doorPos.push(pos)
      })
  }

  private createRandomAutoAgv() {
    let r = Math.floor(Math.random() * this.pathPos.length)
    while (
      !Constant.validDestination(this.pathPos[r].x, this.pathPos[r].y, 1, 13)
    ) {
      r = Math.floor(Math.random() * this.pathPos.length)
    }
    if (this.graph) {
      const tempAgv = new AutoAgv(
        this,
        1,
        13,
        this.pathPos[r].x,
        this.pathPos[r].y,
        this.graph
      )
      this.timeTable && tempAgv.writeDeadline(this.timeTable)
      const des = document.getElementById('des')
      if (des) {
        while (des.childNodes.length >= 1) {
          des.firstChild && des.removeChild(des.firstChild)
        }

        des.appendChild(
          des.ownerDocument.createTextNode(this.timeTable?.text || '')
        )
      }
      this.autoAgvs.add(tempAgv)
    }
  }
  public get graph(): Graph {
    return MODE == ModeOfPathPlanning.FRANSEN
      ? this.spaceGraph!
      : this.emergencyGraph!
  }
  private checkTilesUndirection(
    tileA: Tilemaps.Tile,
    tileB: Tilemaps.Tile
  ): boolean {
    if (tileA.x == tileB.x && tileA.y == tileB.y + 1) {
      if (tileB.properties.direction == 'top' || !tileB.properties.direction) {
        return true
      }
    }
    if (tileA.x + 1 == tileB.x && tileA.y == tileB.y) {
      if (
        tileB.properties.direction == 'right' ||
        !tileB.properties.direction
      ) {
        return true
      }
    }
    if (tileA.x == tileB.x && tileA.y + 1 == tileB.y) {
      if (
        tileB.properties.direction == 'bottom' ||
        !tileB.properties.direction
      ) {
        return true
      }
    }
    if (tileA.x == tileB.x + 1 && tileA.y == tileB.y) {
      if (tileB.properties.direction == 'left' || !tileB.properties.direction) {
        return true
      }
    }
    return false
  }

  private checkTilesNeighbor(
    tileA: Tilemaps.Tile,
    tileB: Tilemaps.Tile
  ): boolean {
    // neu o dang xet khong co huong
    if (!tileA.properties.direction) {
      if (this.checkTilesUndirection(tileA, tileB)) return true
    } else {
      // neu o dang xet co huong
      if (tileA.properties.direction == 'top') {
        if (tileA.x == tileB.x && tileA.y == tileB.y + 1) {
          /*&& tileA.properties.direction != "bottom"*/
          return true
        }
      }
      if (tileA.properties.direction == 'right') {
        if (tileA.x + 1 == tileB.x && tileA.y == tileB.y) {
          /*&& tileA.properties.direction != "left"*/
          return true
        }
      }
      if (tileA.properties.direction == 'bottom') {
        if (tileA.x == tileB.x && tileA.y + 1 == tileB.y) {
          /*&& tileA.properties.direction != "top") {*/
          return true
        }
      }
      if (tileA.properties.direction == 'left') {
        if (tileA.x == tileB.x + 1 && tileA.y == tileB.y) {
          /*&& tileA.properties.direction != "right") {*/
          return true
        }
      }
    }
    return false
  }

  private initTileMap() {
    let tiles: Tilemaps.Tile[] = []
    this.pathLayer
      .getTilesWithin()
      .filter((v) => v.index != -1)
      .forEach((v) => {
        tiles.push(v)
      })
    for (let i = 0; i < tiles.length; i++) {
      for (let j = 0; j < tiles.length; j++) {
        if (i != j) {
          if (this.checkTilesNeighbor(tiles[i], tiles[j])) {
            this.listTile[tiles[i].x][tiles[i].y].push(
              new Position(tiles[j].x, tiles[j].y)
            )
          }
        }
      }
    }
  }

  public getAgentByID(id: number): Agent | null {
    const index = this.agents.findIndex((agent) => agent.getId() === id)
    if (index === -1) return null
    return this.agents[index]
  }

  public getAgvById(id: number): AutoAgv | null {
    let autoAgv: AutoAgv | null = null
    this.autoAgvs.forEach((agv) =>
      agv.getAgvID() === id ? (autoAgv = agv) : null
    )
    return autoAgv
  }
  public getRandomAgentEndPos() {
    const rand = Math.floor(Math.random() * this.doorPos.length)
    return this.doorPos[rand]
  }
}
