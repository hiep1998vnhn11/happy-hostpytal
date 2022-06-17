import { Position } from '../classes/position'
type Heuristic = (pos0: GridNode, pos1: GridNode) => number
interface AstarOption {
  heuristic?: Heuristic
  diagonal?: boolean
  closest?: boolean
}

class BinaryHeap {
  private content: GridNode[] = []
  private scoreFunction: (n: GridNode) => number
  constructor(scoreFunction: (n: GridNode) => number) {
    this.scoreFunction = scoreFunction
  }

  push(element: GridNode) {
    // Add the new element to the end of the array.
    this.content.push(element)

    // Allow it to sink down.
    this.sinkDown(this.content.length - 1)
  }

  pop() {
    // Store the first element so we can return it later.
    const result = this.content[0]
    // Get the element at the end of the array.
    const end = this.content.pop()
    // If there are any elements left, put the end element at the
    // start, and let it bubble up.
    if (this.content.length > 0) {
      if (end) this.content[0] = end
      this.bubbleUp(0)
    }
    return result
  }
  remove(node: GridNode) {
    const index = this.content.indexOf(node)

    // When it is found, the process seen in 'pop' is repeated
    // to fill up the hole.
    const end = this.content.pop()

    if (end && index !== this.content.length - 1) {
      this.content[index] = end
      if (this.scoreFunction(end) < this.scoreFunction(node)) {
        this.sinkDown(index)
      } else {
        this.bubbleUp(index)
      }
    }
  }
  size() {
    return this.content.length
  }
  rescoreElement(node: GridNode) {
    this.sinkDown(this.content.indexOf(node))
  }
  sinkDown(n: number) {
    // Fetch the element that has to be sunk.
    const element = this.content[n]

    // When at 0, an element can not sink any further.
    while (n > 0) {
      // Compute the parent element's index, and fetch it.
      const parentN = ((n + 1) >> 1) - 1
      const parent = this.content[parentN]
      // Swap the elements if the parent is greater.
      if (this.scoreFunction(element) < this.scoreFunction(parent)) {
        this.content[parentN] = element
        this.content[n] = parent
        // Update 'n' to continue at the new position.
        n = parentN
      }
      // Found a parent that is less, no need to sink any further.
      else {
        break
      }
    }
  }
  bubbleUp(n: number) {
    // Look up the target element and its score.
    const length = this.content.length
    const element = this.content[n]
    const elemScore = this.scoreFunction(element)

    while (true) {
      // Compute the indices of the child elements.
      const child2N = (n + 1) << 1
      const child1N = child2N - 1
      // This is used to store the new position of the element, if any.
      let swap: null | number = null
      let child1Score = 0
      // If the first child exists (is inside the array)...
      if (child1N < length) {
        // Look it up and compute its score.
        const child1 = this.content[child1N]
        child1Score = this.scoreFunction(child1)

        // If the score is less than our element's, we need to swap.
        if (child1Score < elemScore) {
          swap = child1N
        }
      }

      // Do the same checks for the other child.
      if (child2N < length) {
        const child2 = this.content[child2N]
        const child2Score = this.scoreFunction(child2)
        if (child2Score < (swap === null ? elemScore : child1Score)) {
          swap = child2N
        }
      }

      // If the element needs to be moved, swap it, and continue.
      if (swap !== null) {
        this.content[n] = this.content[swap]
        this.content[swap] = element
        n = swap
      }
      // Otherwise, we are done.
      else {
        break
      }
    }
  }
}

class Graph {
  private nodes: GridNode[] = []
  diagonal: boolean = false
  grid: GridNode[][] = []
  dirtyNodes: GridNode[] = []

  constructor(
    diagonal: boolean,
    width: number,
    height: number,
    groundPos: Position[],
    pathPos: Position[],
    excludedPos?: Position
  ) {
    this.diagonal = diagonal
    this.init(groundPos, width, height, pathPos, excludedPos)
  }

  init(
    groundPos: Position[],
    width: number,
    height: number,
    pathPos: Position[],
    excludedPos?: Position
  ) {
    this.dirtyNodes = []
    this.nodes = []
    for (const node of this.nodes) {
      node.clean()
    }
    this.grid = []
    groundPos.forEach((pos) => {
      if (!this.grid[pos.x]) this.grid[pos.x] = []
      this.grid[pos.x][pos.y] = new GridNode(pos.x, pos.y, 1)
    })
    pathPos.forEach((pos) => {
      if (!this.grid[pos.x]) this.grid[pos.x] = []
      this.grid[pos.x][pos.y] = new GridNode(pos.x, pos.y, 5)
    })
    for (let x = 0; x < height; x++) {
      if (!this.grid[x]) this.grid[x] = []
      for (let y = 0; y < width; y++) {
        if (!this.grid[x][y]) this.grid[x][y] = new GridNode(x, y, 0)
      }
    }
    if (excludedPos) {
      this.grid[excludedPos.x][excludedPos.y].weight = 0
    }
    // Cổng T
    this.grid[50][13].weight = 0
    this.grid[50][14].weight = 0
    this.grid[1][14].weight = 0
    this.grid[1][13].weight = 0
  }
  clearnDirty() {
    for (const node of this.dirtyNodes) {
      node.clean()
    }
    this.dirtyNodes = []
  }
  markDirty(node: GridNode) {
    this.dirtyNodes.push(node)
  }
  neighbors(node: GridNode) {
    const ret: GridNode[] = []
    const x = node.x
    const y = node.y
    const grid = this.grid

    //West
    if (grid[x - 1] && grid[x - 1][y]) {
      ret.push(grid[x - 1][y])
    }
    //East
    if (grid[x + 1] && grid[x + 1][y]) {
      ret.push(grid[x + 1][y])
    }
    //North
    if (grid[x] && grid[x][y + 1]) {
      ret.push(grid[x][y + 1])
    }
    //South
    if (grid[x] && grid[x][y - 1]) {
      ret.push(grid[x][y - 1])
    }

    if (this.diagonal) {
      //South-West
      if (grid[x - 1] && grid[x - 1][y - 1]) {
        ret.push(grid[x - 1][y - 1])
      }
      //South-East
      if (grid[x + 1] && grid[x + 1][y - 1]) {
        ret.push(grid[x + 1][y - 1])
      }
      //North-West
      if (grid[x - 1] && grid[x - 1][y + 1]) {
        ret.push(grid[x - 1][y + 1])
      }
      //North-East
      if (grid[x + 1] && grid[x + 1][y + 1]) {
        ret.push(grid[x + 1][y + 1])
      }
    }
    return ret
  }
  toString() {
    const grid = this.grid
    const grapString: string[] = []
    for (let y = 0; y < grid.length; y++) {
      const row = grid[y]
      const rowString: string[] = []
      for (let x = 0; x < row.length; x++) {
        const node = row[x]
        rowString.push(node.toString())
      }
      grapString.push(rowString.join(' '))
    }
    return grapString.join('\n')
  }
}

class GridNode {
  x: number
  y: number
  weight: number
  parent: GridNode | null = null
  f: number = 0
  g: number = 0
  h: number = 0
  visited: boolean = false
  closed: boolean = false
  constructor(x: number, y: number, weight: number) {
    this.x = x
    this.y = y
    this.weight = weight
  }
  toString() {
    return `[${this.x} ${this.y}]`
  }
  getCost(fromNeighbor: GridNode) {
    if (
      fromNeighbor &&
      fromNeighbor.x !== this.x &&
      fromNeighbor.y !== this.y
    ) {
      return this.weight * 1.41421
    }
    return this.weight
  }
  isWall() {
    return this.weight === 0
  }
  clean() {
    this.parent = null
    this.f = 0
    this.g = 0
    this.h = 0
    this.visited = false
    this.closed = false
  }
}

export class AstarSearch {
  heap: BinaryHeap
  graph: Graph
  constructor(
    width: number,
    height: number,
    groundPos: Position[],
    pathPos: Position[],
    excludedPos?: Position
  ) {
    this.heap = new BinaryHeap((node: GridNode) => {
      return node.f
    })
    this.graph = new Graph(true, width, height, groundPos, pathPos, excludedPos)
  }
  pathTo(node: GridNode) {
    let curr: GridNode = node
    const path: Position[] = []
    while (curr.parent) {
      path.push(new Position(curr.x, curr.y))
      curr = curr.parent
    }
    return path
  }
  search(startPos: Position, endPos: Position, options: AstarOption = {}) {
    const start = new GridNode(startPos.x, startPos.y, 1)
    const end = new GridNode(endPos.x, endPos.y, 1)
    this.graph.clearnDirty()
    const { heuristic = this.heuristics.diagonal, closest = true } = options
    let closestNode = start // set the start node to be the closest if required

    start.h = heuristic(start, end)
    this.graph.markDirty(start)
    this.heap.push(start)

    while (this.heap.size() > 0) {
      // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
      const currentNode = this.heap.pop()

      // End case -- result has been found, return the traced path.
      if (currentNode === end) {
        return this.pathTo(currentNode)
      }

      // Normal case -- move currentNode from open to closed, process each of its neighbors.
      currentNode.closed = true

      // Find all neighbors for the current node.
      const neighbors = this.graph.neighbors(currentNode)

      for (var i = 0, il = neighbors.length; i < il; ++i) {
        var neighbor = neighbors[i]

        if (neighbor.closed || neighbor.isWall()) {
          // Not a valid node to process, skip to next neighbor.
          continue
        }

        // The g score is the shortest distance from start to current node.
        // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
        const gScore = currentNode.g + neighbor.getCost(currentNode)
        const beenVisited = neighbor.visited

        if (!beenVisited || gScore < neighbor.g) {
          // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
          neighbor.visited = true
          neighbor.parent = currentNode
          neighbor.h = neighbor.h || heuristic(neighbor, end)
          neighbor.g = gScore
          neighbor.f = neighbor.g + neighbor.h
          this.graph.markDirty(neighbor)
          if (closest) {
            // If the neighbour is closer than the current closestNode or if it's equally close but has
            // a cheaper path than the current closest node then it becomes the closest node
            if (
              neighbor.h < closestNode.h ||
              (neighbor.h === closestNode.h && neighbor.g < closestNode.g)
            ) {
              closestNode = neighbor
            }
          }

          if (!beenVisited) {
            // Pushing to heap will put it in proper place based on the 'f' value.
            this.heap.push(neighbor)
          } else {
            // Already seen the node, but since it has been rescored we need to reorder it in the heap
            this.heap.rescoreElement(neighbor)
          }
        }
      }
    }

    if (closest) {
      return this.pathTo(closestNode)
    }

    // No result was found - empty array signifies failure to find path.
    return []
  }
  // See list of heuristics: http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html
  heuristics: Record<string, Heuristic> = {
    manhattan: function (pos0: GridNode, pos1: GridNode) {
      const d1 = Math.abs(pos1.x - pos0.x)
      const d2 = Math.abs(pos1.y - pos0.y)
      return d1 + d2
    },
    diagonal: function (pos0: GridNode, pos1: GridNode) {
      const D = 1
      const D2 = Math.sqrt(2)
      const d1 = Math.abs(pos1.x - pos0.x)
      const d2 = Math.abs(pos1.y - pos0.y)
      return D * (d1 + d2) + (D2 - 2 * D) * Math.min(d1, d2)
    },
  }
}
