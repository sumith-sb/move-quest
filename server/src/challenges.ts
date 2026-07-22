import type { Challenge, Difficulty, PublicChallenge } from './types.js'

/**
 * Move Quest's soul lives here: meaningful, photogenic prompts that get you
 * off your chair and into another room. Every challenge is tagged with the
 * room it lives in (never the desk) and a vibe used for feed framing.
 *
 * The daily draw always returns one Easy + one Medium + one Hard — the three
 * options are an effort ladder (quick / another room / step outside).
 */
export const CHALLENGES: Challenge[] = [
  // --- Easy: a quick stretch away from the desk (10 pts) --------------------
  {
    id: 'ch_water',
    slug: 'get-water',
    title: 'Refill your water',
    prompt: 'Pour a fresh glass or bottle of water and photograph it.',
    difficulty: 'easy',
    room: 'kitchen',
    vibe: 'hydrate',
    points: 10,
    criteria: [{ id: 'water_visible', description: 'A glass or bottle of water is clearly visible' }],
    active: true,
  },
  {
    id: 'ch_window_view',
    slug: 'window-view',
    title: 'Look up and out',
    prompt: 'Walk to your nearest window and photograph the view outside.',
    difficulty: 'easy',
    room: 'window',
    vibe: 'nature',
    points: 10,
    criteria: [{ id: 'view_visible', description: 'A view through a window is clearly visible' }],
    active: true,
  },
  {
    id: 'ch_plant',
    slug: 'say-hi-plant',
    title: 'Say hi to a plant',
    prompt: 'Find a plant nearby and photograph it up close.',
    difficulty: 'easy',
    room: 'lounge',
    vibe: 'nature',
    points: 10,
    criteria: [
      { id: 'plant_visible', description: 'A plant is clearly visible' },
      { id: 'plant_real', description: 'The plant is real (not a drawing or screen)' },
    ],
    active: true,
  },

  // --- Medium: another room, a few steps (25 pts) ---------------------------
  {
    id: 'ch_stairs',
    slug: 'take-the-stairs',
    title: 'Take the stairs',
    prompt: 'Walk a staircase and photograph it from the top or bottom.',
    difficulty: 'medium',
    room: 'hallway',
    vibe: 'movement',
    points: 25,
    criteria: [{ id: 'stairs_visible', description: 'A staircase with multiple steps is visible' }],
    active: true,
  },
  {
    id: 'ch_tidy',
    slug: 'tidy-one-thing',
    title: 'Tidy one thing',
    prompt: 'Clear or organize one surface, then photograph the result.',
    difficulty: 'medium',
    room: 'lounge',
    vibe: 'tidy',
    points: 25,
    criteria: [{ id: 'surface_visible', description: 'A tidied surface is clearly visible' }],
    active: true,
  },
  {
    id: 'ch_made',
    slug: 'made-with-hands',
    title: 'Made with your hands',
    prompt: 'Make a snack, tea, or coffee and photograph what you made.',
    difficulty: 'medium',
    room: 'kitchen',
    vibe: 'craft',
    points: 25,
    criteria: [{ id: 'made_visible', description: 'Freshly prepared food or drink is visible' }],
    active: true,
  },

  // --- Hard: leave the building or connect with someone (50 pts) ------------
  {
    id: 'ch_outside',
    slug: 'step-outside',
    title: 'Step outside',
    prompt: 'Go outdoors and photograph the sky, a tree, or the street.',
    difficulty: 'hard',
    room: 'outdoors',
    vibe: 'fresh-air',
    points: 50,
    criteria: [{ id: 'outdoors', description: 'The photo appears to be taken outdoors' }],
    active: true,
  },
  {
    id: 'ch_colleague',
    slug: 'say-hello',
    title: 'Say hello to someone',
    prompt: 'Greet a colleague and photograph a friendly wave (a selfie together counts).',
    difficulty: 'hard',
    room: 'anywhere',
    vibe: 'social',
    points: 50,
    criteria: [{ id: 'person_visible', description: 'A person waving or two people are visible' }],
    active: true,
  },
  {
    id: 'ch_reflection',
    slug: 'catch-a-reflection',
    title: 'Catch a reflection',
    prompt: 'Find a reflection in glass, water, or a mirror and photograph it.',
    difficulty: 'hard',
    room: 'anywhere',
    vibe: 'craft',
    points: 50,
    criteria: [{ id: 'reflection_visible', description: 'A reflection in a reflective surface is visible' }],
    active: true,
  },
]

const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard']

export function getChallenge(id: string): Challenge | undefined {
  return CHALLENGES.find((c) => c.id === id && c.active)
}

export function toPublicChallenge(challenge: Challenge): PublicChallenge {
  return {
    id: challenge.id,
    slug: challenge.slug,
    title: challenge.title,
    prompt: challenge.prompt,
    difficulty: challenge.difficulty,
    room: challenge.room,
    vibe: challenge.vibe,
    points: challenge.points,
  }
}

function pickOne<T>(items: T[], random: () => number): T | undefined {
  if (items.length === 0) return undefined
  return items[Math.floor(random() * items.length)]
}

/**
 * Draw exactly one Easy, one Medium, and one Hard challenge — the movement
 * ladder (quick / another room / step outside). Completed challenges are
 * excluded; a tier with nothing left simply contributes no card.
 */
export function drawTriad(
  excludeIds: Iterable<string>,
  random: () => number = Math.random,
): Challenge[] {
  const excluded = new Set(excludeIds)
  const result: Challenge[] = []

  for (const difficulty of DIFFICULTY_ORDER) {
    const tier = CHALLENGES.filter(
      (c) => c.active && c.difficulty === difficulty && !excluded.has(c.id),
    )
    const chosen = pickOne(tier, random)
    if (chosen) result.push(chosen)
  }

  return result
}

/** How many challenges the user still has left across all tiers. */
export function remainingCount(excludeIds: Iterable<string>): number {
  const excluded = new Set(excludeIds)
  return CHALLENGES.filter((c) => c.active && !excluded.has(c.id)).length
}
