const MAX_UPLOAD_BYTES = 950 * 1024
const MAX_EDGES = [1920, 1280, 960] as const
const QUALITIES = [0.82, 0.72, 0.62, 0.52] as const

const TOO_LARGE_MESSAGE =
  'Photo is too large to compress. Try retaking closer or with less background detail.'

type DecodedImage = ImageBitmap | HTMLImageElement

function isJpeg(file: File): boolean {
  const t = file.type.toLowerCase()
  return t === 'image/jpeg' || t === 'image/jpg'
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // fall through to Image element
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read this image. Try retaking the photo.'))
    }
    img.src = url
  })
}

function imageSize(img: DecodedImage): { width: number; height: number } {
  if (img instanceof HTMLImageElement) {
    return { width: img.naturalWidth, height: img.naturalHeight }
  }
  return { width: img.width, height: img.height }
}

function scaledSize(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxEdge) return { width, height }
  const scale = maxEdge / longest
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Could not encode photo.'))
      },
      'image/jpeg',
      quality,
    )
  })
}

async function encodeJpeg(
  img: DecodedImage,
  maxEdge: number,
  quality: number,
): Promise<Blob> {
  const { width: srcW, height: srcH } = imageSize(img)
  const { width, height } = scaledSize(srcW, srcH, maxEdge)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not prepare photo.')
  ctx.drawImage(img, 0, 0, width, height)
  return canvasToJpeg(canvas, quality)
}

function releaseImage(img: DecodedImage): void {
  if (img instanceof ImageBitmap) img.close()
}

/** Resize and re-encode as JPEG so uploads stay under the 1 MiB server limit. */
export async function preparePhotoForUpload(file: File): Promise<Blob> {
  if (file.size <= MAX_UPLOAD_BYTES && isJpeg(file)) {
    return file
  }

  const img = await decodeImage(file)
  try {
    for (const maxEdge of MAX_EDGES) {
      for (const quality of QUALITIES) {
        const blob = await encodeJpeg(img, maxEdge, quality)
        if (blob.size <= MAX_UPLOAD_BYTES) return blob
      }
    }
  } finally {
    releaseImage(img)
  }

  throw new Error(TOO_LARGE_MESSAGE)
}

// ponytail: constants must step down so the encoder loop actually tightens
console.assert(MAX_EDGES[0]! > MAX_EDGES.at(-1)!, 'preparePhoto: max edges descend')
for (let i = 1; i < QUALITIES.length; i++) {
  console.assert(QUALITIES[i]! < QUALITIES[i - 1]!, 'preparePhoto: qualities descend')
}
