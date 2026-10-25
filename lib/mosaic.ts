export type Position = { row: number; col: number }

/** Enumerating the finite grid also guarantees termination when it is full. */
export function availablePositions(rows: number, cols: number, occupied: Position[]): Position[] {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) return []
  const used = new Set(occupied.map(tile => `${tile.row}-${tile.col}`))
  const free: Position[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!used.has(`${row}-${col}`)) free.push({ row, col })
    }
  }
  return free
}

export function loadCanvasImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Impossible de charger une image de la mosaïque.'))
    image.src = src
  })
}
