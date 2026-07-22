import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import convert from 'heic-convert'

const execFileAsync = promisify(execFile)

export const UPLOAD_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
])

const HEIC_BRANDS = new Set([
  'heic',
  'heix',
  'hevc',
  'hevx',
  'heim',
  'heis',
  'hevm',
  'hevs',
  'mif1',
  'msf1',
  'heif',
])

export function sniffImageMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return 'image/png'
  }
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp'
  }
  if (isHeicBuffer(buf)) {
    return 'image/heic'
  }
  return null
}

export function isHeicBuffer(buf: Buffer): boolean {
  if (buf.length < 12) return false
  if (buf.toString('ascii', 4, 8) !== 'ftyp') return false
  const major = buf.toString('ascii', 8, 12)
  if (HEIC_BRANDS.has(major)) return true
  for (let i = 16; i + 4 <= Math.min(buf.length, 64); i += 4) {
    if (HEIC_BRANDS.has(buf.toString('ascii', i, i + 4))) return true
  }
  return false
}

export function extensionForMime(mime: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}

export function isHeicMimeOrName(mime: string, originalName = ''): boolean {
  return (
    mime === 'image/heic' ||
    mime === 'image/heif' ||
    mime === 'image/heic-sequence' ||
    mime === 'image/heif-sequence' ||
    mime === 'application/heic' ||
    mime === 'application/heif' ||
    /\.hei[cf]$/i.test(originalName)
  )
}

/**
 * Multer pre-filter: be permissive — iOS often sends odd MIME / blank type.
 * Final validation is magic-byte sniffing after upload.
 */
export function isAllowedUploadMime(mime: string, originalName = ''): boolean {
  const normalized = (mime || '').toLowerCase().trim()
  if (UPLOAD_MIMES.has(normalized)) return true
  if (normalized.startsWith('image/')) return true
  if (
    normalized === '' ||
    normalized === 'application/octet-stream' ||
    normalized === 'application/heic' ||
    normalized === 'application/heif'
  ) {
    return true
  }
  return /\.(jpe?g|png|webp|hei[cf])$/i.test(originalName)
}

export type NormalizedImage = {
  buffer: Buffer
  mime: 'image/jpeg' | 'image/png' | 'image/webp'
}

async function convertHeicWithLib(buffer: Buffer): Promise<Buffer> {
  const output = await convert({
    buffer,
    format: 'JPEG',
    quality: 0.9,
  })
  return Buffer.from(output)
}

/** macOS Preview stack — reliably decodes iPhone HEVC HEIC. */
async function convertHeicWithSips(buffer: Buffer): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), 'move-quest-heic-'))
  const inputPath = path.join(dir, `${randomUUID()}.heic`)
  const outputPath = path.join(dir, `${randomUUID()}.jpg`)
  try {
    await writeFile(inputPath, buffer)
    await execFileAsync('sips', ['-s', 'format', 'jpeg', inputPath, '--out', outputPath], {
      timeout: 60_000,
    })
    const jpeg = await readFile(outputPath)
    if (jpeg.length < 24 || sniffImageMime(jpeg) !== 'image/jpeg') {
      throw new Error('sips produced a non-JPEG file')
    }
    return jpeg
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

export async function convertHeicToJpeg(buffer: Buffer): Promise<Buffer> {
  const errors: string[] = []

  try {
    return await convertHeicWithLib(buffer)
  } catch (err) {
    errors.push(`heic-convert: ${(err as Error).message}`)
  }

  if (process.platform === 'darwin') {
    try {
      return await convertHeicWithSips(buffer)
    } catch (err) {
      errors.push(`sips: ${(err as Error).message}`)
    }
  }

  throw new Error(`Could not decode HEIC/HEIF (${errors.join(' | ')})`)
}

/** Decode HEIC/HEIF to JPEG for consistent stored uploads. */
export async function normalizeUploadImage(
  buffer: Buffer,
  sniffedMime: string,
): Promise<NormalizedImage> {
  if (sniffedMime === 'image/heic' || sniffedMime === 'image/heif') {
    return {
      buffer: await convertHeicToJpeg(buffer),
      mime: 'image/jpeg',
    }
  }
  if (
    sniffedMime === 'image/jpeg' ||
    sniffedMime === 'image/png' ||
    sniffedMime === 'image/webp'
  ) {
    return { buffer, mime: sniffedMime }
  }
  throw new Error(`Unsupported image type: ${sniffedMime}`)
}
