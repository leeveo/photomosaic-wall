export async function drawMosaic(
  canvas: HTMLCanvasElement,
  userImages: string[]
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const rows = 4
  const cols = 6
  const tileWidth = canvas.width / cols
  const tileHeight = canvas.height / rows

  const mainImage = new Image()
  mainImage.src = '/main.jpg'

  await new Promise((resolve) => {
    mainImage.onload = resolve
  })

  // Dessiner image de base
  ctx.drawImage(mainImage, 0, 0, canvas.width, canvas.height)

  // Superposer les tuiles utilisateurs
  userImages.forEach((imgSrc, i) => {
    const x = (i % cols) * tileWidth
    const y = Math.floor(i / cols) * tileHeight

    const img = new Image()
    img.src = imgSrc
    img.onload = () => {
      // Dessiner photo utilisateur
      ctx.drawImage(img, x, y, tileWidth, tileHeight)

      // Extraire couleur moyenne
      const mainSlice = ctx.getImageData(x, y, tileWidth, tileHeight).data
      let r = 0, g = 0, b = 0
      for (let j = 0; j < mainSlice.length; j += 4) {
        r += mainSlice[j]
        g += mainSlice[j + 1]
        b += mainSlice[j + 2]
      }
      const totalPixels = mainSlice.length / 4
      r /= totalPixels
      g /= totalPixels
      b /= totalPixels

      // Dessiner un rectangle de couleur avec opacité
      ctx.fillStyle = `rgba(${r},${g},${b},0.4)`
      ctx.fillRect(x, y, tileWidth, tileHeight)
    }
  })
}
