import { Position } from '../classes/position'
class GraphNode {
  x: number
  y: number
  g: number
  h: number
  f: number
  pV: GraphNode | null
  constructor(
    x: number,
    y: number,
    g: number,
    h: number,
    pV: GraphNode | null
  ) {
    this.x = x
    this.y = y
    this.g = g
    this.h = h
    this.f = g + h
    this.pV = pV
  }
}
class Cell {
  x: number
  y: number
  movable: boolean
  constructor(x: number, y: number) {
    this.x = x
    this.y = y
    this.movable = false
  }
}

export const calPathAstar = (
  adjacentList: any,
  start: Position,
  end: Position
) => {
  const openList: GraphNode[] = []
  const closedList: GraphNode[] = []
  const result: Position[] = []
  openList.push(
    new GraphNode(
      start.x,
      start.y,
      0,
      Math.abs(start.y - end.y) + Math.abs(start.x - end.x),
      null
    )
  )
  while (openList.length > 0) {
    let smallestF = openList[0].f
    let currentNode = openList[0]
    for (let i of openList) {
      if (i.f < smallestF) {
        smallestF = i.f
        currentNode = i
      }
    }
    let [x, y] = [currentNode.x, currentNode.y]
    if (!adjacentList[x]) {
      openList.splice(openList.indexOf(currentNode), 1)
      closedList.push(currentNode)
      continue
    }
    for (let i of adjacentList[x][y]) {
      let [nodeX, nodeY] = [i.x, i.y]
      if (closedList.findIndex((i) => i.x === nodeX && i.y === nodeY) != -1)
        continue
      let nodeG = currentNode.g + 1
      let nodeH = Math.abs(nodeY - end.y) + Math.abs(nodeX - end.x)
      if (nodeH === 0) {
        result.push(end)
        while (currentNode) {
          result.push(new Position(currentNode.x, currentNode.y))
          currentNode = currentNode.pV!
        }
        return result
      }
      openList.push(new GraphNode(nodeX, nodeY, nodeG, nodeH, currentNode))
    }
    openList.splice(openList.indexOf(currentNode), 1)
    closedList.push(currentNode)
  }
  return []
}

export const calPathAstarGrid = (
  width: number,
  height: number,
  movableCells: Position[],
  start: Position,
  end: Position
) => {
  const getNeighbor = (x: number, y: number) => {
    const check = x == start.x && y == start.y
    const res = check
      ? [
          { x: x, y: y + 1 },
          { x: x, y: y - 1 },
          { x: x + 1, y: y },
          { x: x - 1, y: y },
        ]
      : [
          { x: x + 1, y: y + 1 },
          { x: x, y: y + 1 },
          { x: x + 1, y: y - 1 },
          { x: x, y: y - 1 },
          { x: x + 1, y: y },
          { x: x - 1, y: y },
          { x: x - 1, y: y - 1 },
          { x: x - 1, y: y + 1 },
        ]
    return res.filter(
      (i) => i.x >= 0 && i.x < width && i.y >= 0 && i.y < height
    )
  }
  const grid: Array<Cell[]> = [[]]
  for (let i = 0; i < width; i++) {
    if (!grid[i]) grid[i] = []
    for (let j = 0; j < height; j++) {
      grid[i][j] = new Cell(i, j)
    }
  }
  for (let i of movableCells) {
    grid[i.x][i.y].movable = true
  }
  const openList: GraphNode[] = []
  const closedList: GraphNode[] = []
  const result: Position[] = []
  openList.push(
    new GraphNode(
      start.x,
      start.y,
      0,
      Math.abs(start.y - end.y) + Math.abs(start.x - end.x),
      null
    )
  )

  while (openList.length > 0) {
    let smallestF = openList[0].f
    let currentNode = openList[0]
    for (const i of openList) {
      if (i.f < smallestF) {
        smallestF = i.f
        currentNode = i
      }
    }
    let [x, y] = [currentNode.x, currentNode.y]
    for (const i of getNeighbor(x, y)) {
      let [newX, newY, newG, newH] = [
        i.x,
        i.y,
        currentNode.g +
          (i.x != currentNode.x && i.y != currentNode.y ? 1.4 : 1),
        Math.abs(end.y - i.y) + Math.abs(end.x - i.x),
      ]
      if (grid[newX][newY].movable == false) continue
      if (closedList.findIndex((i) => i.x == newX && i.y == newY) != -1)
        continue
      const newNodeIndex = openList.findIndex((i) => i.x == newX && i.y == newY)
      if (newNodeIndex != -1) {
        let node = openList[newNodeIndex]
        if (node.f > newG + newH) {
          openList[newNodeIndex] = new GraphNode(
            newX,
            newY,
            newG,
            newH,
            currentNode
          )
        }
        continue
      }
      if (newH === 0) {
        result.push(end)
        while (currentNode) {
          result.push(new Position(currentNode.x, currentNode.y))
          currentNode = currentNode.pV!
        }
        return result
      }
      let newNode = new GraphNode(newX, newY, newG, newH, currentNode)
      openList.push(newNode)
    }
    openList.splice(openList.indexOf(currentNode), 1)
    closedList.push(currentNode)
  }
  return []
}
