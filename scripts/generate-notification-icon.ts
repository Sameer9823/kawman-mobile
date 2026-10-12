/**
 * Generate the Android notification icon (96x96 white-on-transparent PNG).
 *
 * Android notification icons must be a single-color (white) glyph on a transparent
 * background. This script draws a simple bell icon and writes it as a valid PNG.
 *
 * Usage:  npx tsx scripts/generate-notification-icon.ts
 */
import { writeFileSync } from 'fs'
import { resolve } from 'path'
import { deflateRawSync } from 'zlib'

const ASSETS = resolve(import.meta.dirname, '../assets')

function crc32(data: Buffer): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1))
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function createPng(width: number, height: number, rgba: Uint8Array): Buffer {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR: width, height, bit depth=8, color type=6 (RGBA), compression=0, filter=0, interlace=0
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  // IDAT: raw scanlines with filter byte 0 (None) per row
  const raw = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    let pos = y * (1 + width * 4)
    raw[pos] = 0 // filter: None
    pos++
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4
      raw[pos++] = rgba[si]
      raw[pos++] = rgba[si + 1]
      raw[pos++] = rgba[si + 2]
      raw[pos++] = rgba[si + 3]
    }
  }
  const compressed = deflateRawSync(raw)

  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', compressed), pngChunk('IEND', Buffer.alloc(0))])
}

function generateBellIcon(): { width: number; height: number; data: Uint8Array } {
  const W = 96
  const H = 96
  const data = new Uint8Array(W * H * 4)
  // All transparent by default (already zeroed)

  // Draw a bell shape in white
  // Bell body: rounded rectangle from roughly (28, 22) to (68, 72)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4

      // Bell body (vertical rounded rectangle)
      const bellLeft = 28, bellRight = 68, bellTop = 22, bellBottom = 68
      const cornerRadius = 10

      if (pointInRoundedRect(x, y, bellLeft, bellTop, bellRight, bellBottom, cornerRadius)) {
        setWhite(data, i)
      }

      // Bell upper curve: make the top narrower
      if (y < 32 && x >= 36 && x <= 60) {
        const curve = Math.sin(((x - 36) / 24) * Math.PI)
        if (y > 22 + (1 - curve) * 6) setWhite(data, i)
      }

      // Clapper (small circle)
      const clapperX = 48, clapperY = 58, clapperR = 5
      if (dist(x, y, clapperX, clapperY) <= clapperR) {
        setWhite(data, i)
      }

      // Strike plate (small rectangle at top center)
      if (x >= 44 && x <= 52 && y >= 14 && y <= 18) {
        setWhite(data, i)
      }
    }
  }

  return { width: W, height: H, data }
}

function setWhite(data: Uint8Array, i: number): void {
  data[i] = 255     // R
  data[i + 1] = 255 // G
  data[i + 2] = 255 // B
  data[i + 3] = 255 // A
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

function pointInRoundedRect(
  x: number, y: number,
  left: number, top: number, right: number, bottom: number,
  radius: number
): boolean {
  if (x < left || x > right || y < top || y > bottom) return false
  // Check corners
  const corners = [
    { x: left + radius, y: top + radius, cx: left + radius, cy: top + radius },
    { x: right - radius, y: top + radius, cx: right - radius, cy: top + radius },
    { x: left + radius, y: bottom - radius, cx: left + radius, cy: bottom - radius },
    { x: right - radius, y: bottom - radius, cx: right - radius, cy: bottom - radius },
  ]
  for (const c of corners) {
    if (x < c.x && y < c.y && dist(x, y, c.cx, c.cy) > radius) return false
    if (x > c.x && y < c.y && dist(x, y, c.cx, c.cy) > radius) return false
    if (x < c.x && y > c.y && dist(x, y, c.cx, c.cy) > radius) return false
    if (x > c.x && y > c.y && dist(x, y, c.cx, c.cy) > radius) return false
  }
  return true
}

async function main() {
  console.log('[notification-icon] Generating 96x96 white bell icon...')
  const icon = generateBellIcon()
  const png = createPng(icon.width, icon.height, icon.data)
  const outPath = resolve(ASSETS, 'notification-icon.png')
  writeFileSync(outPath, png)
  console.log(`[notification-icon] Wrote ${outPath} (${icon.width}x${icon.height})`)
}

main().catch(console.error)
