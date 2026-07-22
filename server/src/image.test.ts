import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isAllowedUploadMime,
  isHeicBuffer,
  sniffImageMime,
} from './image.js'

describe('image sniffing', () => {
  it('detects jpeg/png/webp magic bytes', () => {
    assert.equal(sniffImageMime(Buffer.from([0xff, 0xd8, 0xff, 0x00])), 'image/jpeg')
    assert.equal(
      sniffImageMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
      'image/png',
    )
    const webp = Buffer.alloc(12)
    webp.write('RIFF', 0)
    webp.write('WEBP', 8)
    assert.equal(sniffImageMime(webp), 'image/webp')
  })

  it('detects HEIC ftyp brands', () => {
    const heic = Buffer.alloc(20)
    heic.writeUInt32BE(20, 0)
    heic.write('ftyp', 4)
    heic.write('heic', 8)
    assert.equal(isHeicBuffer(heic), true)
    assert.equal(sniffImageMime(heic), 'image/heic')
  })

  it('allows HEIC mime and octet-stream .heic filenames', () => {
    assert.equal(isAllowedUploadMime('image/heic'), true)
    assert.equal(isAllowedUploadMime('image/heif'), true)
    assert.equal(isAllowedUploadMime('application/octet-stream', 'IMG_001.HEIC'), true)
    assert.equal(isAllowedUploadMime('', 'photo'), true)
    assert.equal(isAllowedUploadMime('image/foo'), true)
  })
})
