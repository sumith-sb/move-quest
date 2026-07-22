import { readFile } from 'node:fs/promises'
import type { Challenge, VerificationOutcome } from './types.js'
import {
  ModelParseError,
  buildVerificationPrompt,
  parseModelVerdict,
  toVerificationOutcome,
} from './verification.js'

const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434'
const DEFAULT_MODEL = 'gemma4:e4b'
const REQUEST_TIMEOUT_MS = 90_000

export function getOllamaConfig() {
  return {
    baseUrl: (process.env.OLLAMA_URL ?? DEFAULT_OLLAMA_URL).replace(/\/$/, ''),
    model: process.env.OLLAMA_MODEL ?? DEFAULT_MODEL,
  }
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1))
    }
    throw new ModelParseError('Model response was not valid JSON')
  }
}

async function callOllamaOnce(
  challenge: Challenge,
  imageBase64: string,
): Promise<VerificationOutcome> {
  const { baseUrl, model } = getOllamaConfig()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        stream: false,
        format: 'json',
        options: { temperature: 0 },
        messages: [
          {
            role: 'user',
            content: buildVerificationPrompt(challenge),
            images: [imageBase64],
          },
        ],
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      return {
        kind: 'error',
        retryable: true,
        reason: `Ollama unavailable (${response.status})${body ? `: ${body.slice(0, 120)}` : ''}`,
      }
    }

    const payload = (await response.json()) as {
      message?: { content?: string }
    }
    const content = payload.message?.content
    if (!content) {
      return {
        kind: 'error',
        retryable: true,
        reason: 'Ollama returned an empty response',
      }
    }

    try {
      const parsed = extractJsonObject(content)
      const verdict = parseModelVerdict(parsed, challenge)
      return toVerificationOutcome(verdict, model)
    } catch (err) {
      if (err instanceof ModelParseError || err instanceof SyntaxError) {
        return {
          kind: 'error',
          retryable: true,
          reason: 'Verification unavailable; model returned invalid output.',
        }
      }
      throw err
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      return {
        kind: 'error',
        retryable: true,
        reason: 'Verification timed out; please retry.',
      }
    }
    return {
      kind: 'error',
      retryable: true,
      reason: 'Verification unavailable; please retry.',
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function verifyPhotoWithOllama(
  challenge: Challenge,
  imagePath: string,
): Promise<VerificationOutcome> {
  const bytes = await readFile(imagePath)
  const imageBase64 = bytes.toString('base64')

  let outcome = await callOllamaOnce(challenge, imageBase64)
  if (outcome.kind === 'error') {
    // One retry for transient failures / invalid schema.
    outcome = await callOllamaOnce(challenge, imageBase64)
  }
  return outcome
}

/** Test seam: inject a fake verifier without calling Ollama. */
export type PhotoVerifier = (
  challenge: Challenge,
  imagePath: string,
) => Promise<VerificationOutcome>
