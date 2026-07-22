import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { StoreData } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const DATA_DIR = path.resolve(__dirname, '../data')
export const UPLOADS_DIR = path.resolve(__dirname, '../uploads')
export const STORE_PATH = path.join(DATA_DIR, 'store.json')

const EMPTY_STORE: StoreData = {
  users: [],
  attempts: [],
  scores: [],
}

let queue: Promise<unknown> = Promise.resolve()

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn)
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export async function ensureDataDirs(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true })
  await mkdir(UPLOADS_DIR, { recursive: true })
}

export async function readStore(): Promise<StoreData> {
  await ensureDataDirs()
  try {
    const raw = await readFile(STORE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as StoreData
    return {
      users: parsed.users ?? [],
      attempts: parsed.attempts ?? [],
      scores: parsed.scores ?? [],
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT') {
      await writeStore(EMPTY_STORE)
      return structuredClone(EMPTY_STORE)
    }
    throw err
  }
}

async function writeStore(data: StoreData): Promise<void> {
  await ensureDataDirs()
  const tmp = `${STORE_PATH}.${process.pid}.${Date.now()}.tmp`
  await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  await rename(tmp, STORE_PATH)
}

/** Serialized read-modify-write so concurrent requests don't clobber the JSON file. */
export function updateStore<T>(
  mutator: (store: StoreData) => T | Promise<T>,
): Promise<T> {
  return enqueue(async () => {
    const store = await readStore()
    const result = await mutator(store)
    await writeStore(store)
    return result
  })
}

export async function resetStore(): Promise<void> {
  await updateStore((store) => {
    store.users = []
    store.attempts = []
    store.scores = []
  })
}
