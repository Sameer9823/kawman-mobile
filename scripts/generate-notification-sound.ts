/**
 * Generate a short (1-2 second) two-tone chime WAV file for visit assignment alerts.
 *
 * The sound is a pleasant ascending two-tone chime: 660Hz for 250ms, brief pause,
 * then 880Hz for 250ms, with a soft sine envelope. 44.1kHz, 16-bit mono, <200KB.
 *
 * Usage:  npx tsx scripts/generate-notification-sound.ts
 *
 * This produces an original, non-copyrighted sound — no external audio assets.
 */
import { writeFileSync } from 'fs'
import { resolve } from 'path'
import { Buffer } from 'buffer'

const ASSETS = resolve(import.meta.dirname, '../assets/sounds')

const SAMPLE_RATE = 44100
const BIT_DEPTH = 16
const CHANNELS = 1

function generateTone(frequency: number, durationSec: number, sampleRate: number): Float32Array {
  const numSamples = Math.floor(durationSec * sampleRate)
  const samples = new Float32Array(numSamples)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    // Soft sine wave with a slight decay envelope
    const envelope = Math.exp(-2 * t) * Math.sin(2 * Math.PI * frequency * t)
    // Add a touch of harmonic for richness
    const harmonic = 0.2 * Math.exp(-3 * t) * Math.sin(4 * Math.PI * frequency * t)
    samples[i] = Math.min(1, Math.abs(envelope + harmonic))
  }
  return samples
}

function floatTo16Bit(data: Float32Array): Buffer {
  const buffer = Buffer.alloc(data.length * 2)
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]))
    const clamped = sample < 0 ? sample * 0x8000 : sample * 0x7fff
    buffer.writeInt16LE(Math.round(clamped), i * 2)
  }
  return buffer
}

function createWav(samples: Float32Array, sampleRate: number, bitDepth: number, channels: number): Buffer {
  const byteRate = sampleRate * channels * (bitDepth / 8)
  const blockAlign = channels * (bitDepth / 8)
  const pcm = floatTo16Bit(samples)
  const dataSize = pcm.length

  // RIFF header
  const riff = Buffer.alloc(12)
  riff.write('RIFF', 0, 'ascii')
  riff.writeUInt32LE(36 + dataSize, 4) // file size - 8
  riff.write('WAVE', 8, 'ascii')

  // fmt chunk
  const fmt = Buffer.alloc(24)
  fmt.write('fmt ', 0, 'ascii')
  fmt.writeUInt32LE(16, 4) // chunk size
  fmt.writeUInt16LE(1, 8) // audio format: PCM
  fmt.writeUInt16LE(channels, 10)
  fmt.writeUInt32LE(sampleRate, 12)
  fmt.writeUInt32LE(byteRate, 16)
  fmt.writeUInt16LE(blockAlign, 20)
  fmt.writeUInt16LE(bitDepth, 22)

  // data chunk
  const data = Buffer.alloc(8 + pcm.length)
  data.write('data', 0, 'ascii')
  data.writeUInt32LE(pcm.length, 4)
  pcm.copy(data, 8)

  return Buffer.concat([riff, fmt, data])
}

function generateChime(): Float32Array {
  const tone1 = generateTone(660, 0.25, SAMPLE_RATE)
  const pause = new Float32Array(Math.floor(0.08 * SAMPLE_RATE))
  const tone2 = generateTone(880, 0.25, SAMPLE_RATE)

  const combined = new Float32Array(tone1.length + pause.length + tone2.length)
  combined.set(tone1, 0)
  combined.set(pause, tone1.length)
  combined.set(tone2, tone1.length + pause.length)
  return combined
}

async function main() {
  console.log('[notification-sound] Generating two-tone chime (660Hz + 880Hz)...')
  const samples = generateChime()
  const wav = createWav(samples, SAMPLE_RATE, BIT_DEPTH, CHANNELS)
  const outPath = resolve(ASSETS, 'visit_alert.wav')
  writeFileSync(outPath, wav)
  console.log(`[notification-sound] Wrote ${outPath} (${(wav.length / 1024).toFixed(1)} KB, ${samples.length / SAMPLE_RATE}s)`)
}

main().catch(console.error)
