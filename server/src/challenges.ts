import type { Challenge, PublicChallenge } from './types.js'

export const CHALLENGES: Challenge[] = [
  {
    id: 'ch_sky_blue',
    slug: 'sky-blue',
    title: 'Find the sky',
    prompt: 'Photograph a clear view of the open sky outdoors.',
    difficulty: 'easy',
    points: 10,
    criteria: [
      {
        id: 'sky_visible',
        description: 'Open sky is clearly visible in the photo',
      },
      {
        id: 'outdoors',
        description: 'The photo appears to be taken outdoors',
      },
    ],
    active: true,
  },
  {
    id: 'ch_green_leaf',
    slug: 'green-leaf',
    title: 'Leaf hunt',
    prompt: 'Photograph a green leaf up close.',
    difficulty: 'easy',
    points: 10,
    criteria: [
      {
        id: 'leaf_visible',
        description: 'At least one green leaf is clearly visible',
      },
      {
        id: 'plant_context',
        description: 'The leaf belongs to a plant (not a drawing or screen)',
      },
    ],
    active: true,
  },
  {
    id: 'ch_door_handle',
    slug: 'door-handle',
    title: 'Door handle',
    prompt: 'Photograph a door handle or doorknob.',
    difficulty: 'easy',
    points: 10,
    criteria: [
      {
        id: 'handle_visible',
        description: 'A door handle or doorknob is clearly visible',
      },
      {
        id: 'door_context',
        description: 'The handle is attached to a door or door-like surface',
      },
    ],
    active: true,
  },
  {
    id: 'ch_shoe_pair',
    slug: 'shoe-pair',
    title: 'Your shoes',
    prompt: 'Photograph both of your shoes on the floor.',
    difficulty: 'easy',
    points: 10,
    criteria: [
      {
        id: 'shoes_visible',
        description: 'Two shoes are clearly visible',
      },
      {
        id: 'floor_context',
        description: 'The shoes appear to be resting on a floor or ground',
      },
    ],
    active: true,
  },
  {
    id: 'ch_street_sign',
    slug: 'street-sign',
    title: 'Street sign',
    prompt: 'Photograph a street name or traffic sign outdoors.',
    difficulty: 'medium',
    points: 25,
    criteria: [
      {
        id: 'sign_visible',
        description: 'A street or traffic sign is clearly readable or recognizable',
      },
      {
        id: 'outdoors',
        description: 'The photo appears to be taken outdoors',
      },
    ],
    active: true,
  },
  {
    id: 'ch_bicycle',
    slug: 'bicycle',
    title: 'Wheels turning',
    prompt: 'Photograph a bicycle (any bike, parked or moving).',
    difficulty: 'medium',
    points: 25,
    criteria: [
      {
        id: 'bike_visible',
        description: 'A bicycle is clearly visible',
      },
      {
        id: 'wheels_present',
        description: 'At least one bicycle wheel is visible',
      },
    ],
    active: true,
  },
  {
    id: 'ch_coffee_cup',
    slug: 'coffee-cup',
    title: 'Cup in hand',
    prompt: 'Photograph a coffee or tea cup (mug, takeaway cup, or teacup).',
    difficulty: 'medium',
    points: 25,
    criteria: [
      {
        id: 'cup_visible',
        description: 'A cup or mug is clearly visible',
      },
      {
        id: 'drinkware',
        description: 'The object is drinkware (not a bowl or plate)',
      },
    ],
    active: true,
  },
  {
    id: 'ch_staircase',
    slug: 'staircase',
    title: 'Take the stairs',
    prompt: 'Photograph a staircase with at least three visible steps.',
    difficulty: 'medium',
    points: 25,
    criteria: [
      {
        id: 'stairs_visible',
        description: 'A staircase is clearly visible',
      },
      {
        id: 'multiple_steps',
        description: 'At least three steps can be seen',
      },
    ],
    active: true,
  },
  {
    id: 'ch_reflection',
    slug: 'reflection',
    title: 'Catch a reflection',
    prompt: 'Photograph a clear reflection of yourself or an object in glass, water, or a mirror.',
    difficulty: 'hard',
    points: 50,
    criteria: [
      {
        id: 'reflection_visible',
        description: 'A clear reflection is visible in a reflective surface',
      },
      {
        id: 'reflective_surface',
        description: 'Glass, water, metal, or a mirror is present as the reflecting surface',
      },
    ],
    active: true,
  },
  {
    id: 'ch_yellow_object',
    slug: 'yellow-object',
    title: 'Something yellow',
    prompt: 'Photograph a clearly yellow everyday object outdoors or indoors.',
    difficulty: 'hard',
    points: 50,
    criteria: [
      {
        id: 'yellow_object',
        description: 'A distinctly yellow object is the main subject',
      },
      {
        id: 'object_clarity',
        description: 'The yellow object is in focus and easily identifiable',
      },
    ],
    active: true,
  },
  {
    id: 'ch_person_waving',
    slug: 'person-waving',
    title: 'Friendly wave',
    prompt: 'Photograph a person waving at the camera (can be yourself in a mirror/selfie).',
    difficulty: 'hard',
    points: 50,
    criteria: [
      {
        id: 'person_visible',
        description: 'A person is clearly visible',
      },
      {
        id: 'waving_gesture',
        description: 'A hand is raised in a waving gesture',
      },
    ],
    active: true,
  },
  {
    id: 'ch_clock_face',
    slug: 'clock-face',
    title: 'What time is it?',
    prompt: 'Photograph a clock or watch face showing the time.',
    difficulty: 'hard',
    points: 50,
    criteria: [
      {
        id: 'clock_visible',
        description: 'A clock or watch face is clearly visible',
      },
      {
        id: 'time_readable',
        description: 'The time display (hands or digits) is readable',
      },
    ],
    active: true,
  },
]

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
    points: challenge.points,
  }
}

/** Draw up to `count` distinct active challenges, excluding completed IDs. */
export function drawRandomChallenges(
  excludeIds: Iterable<string>,
  count = 3,
  random: () => number = Math.random,
): Challenge[] {
  const excluded = new Set(excludeIds)
  const pool = CHALLENGES.filter((c) => c.active && !excluded.has(c.id))
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}
