import { create } from 'zustand'

type Store = {
  imageSrc: string | null
  rows: number
  cols: number
  setImage: (src: string) => void
  setGrid: (rows: number, cols: number) => void
}

export const usePhotoMosaicStore = create<Store>((set) => ({
  imageSrc: null,
  rows: 5,
  cols: 8,
  setImage: (src) => set({ imageSrc: src }),
  setGrid: (rows, cols) => set({ rows, cols }),
}))
