import { useEffect, useState } from 'react'

const DEFAULT_COLOR = '#535353'

/**
 * Extracts the dominant color from an image URL using a canvas.
 * Returns a hex color string for use in gradients.
 */
export function useDominantColor(imageUrl) {
  const [color, setColor] = useState(DEFAULT_COLOR)

  useEffect(() => {
    if (!imageUrl) {
      setColor(DEFAULT_COLOR)
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        // Sample at a small size for performance
        const size = 16
        canvas.width = size
        canvas.height = size
        ctx.drawImage(img, 0, 0, size, size)

        const data = ctx.getImageData(0, 0, size, size).data

        let rSum = 0, gSum = 0, bSum = 0, count = 0

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]

          // Skip near-white and near-black pixels so the color is more vibrant
          const brightness = (r + g + b) / 3
          if (brightness > 240 || brightness < 15) continue

          rSum += r
          gSum += g
          bSum += b
          count++
        }

        if (count === 0) {
          // All pixels were extreme — just average everything
          for (let i = 0; i < data.length; i += 4) {
            rSum += data[i]
            gSum += data[i + 1]
            bSum += data[i + 2]
            count++
          }
        }

        const r = Math.round(rSum / count)
        const g = Math.round(gSum / count)
        const b = Math.round(bSum / count)

        // Darken slightly so the gradient looks good against the dark UI
        const darken = 0.7
        const rd = Math.round(r * darken)
        const gd = Math.round(g * darken)
        const bd = Math.round(b * darken)

        const hex = '#' + [rd, gd, bd].map(c => c.toString(16).padStart(2, '0')).join('')
        setColor(hex)
      } catch {
        setColor(DEFAULT_COLOR)
      }
    }

    img.onerror = () => setColor(DEFAULT_COLOR)
    img.src = imageUrl
  }, [imageUrl])

  return color
}
