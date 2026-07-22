import type {
  Challenge,
  Difficulty,
  PublicChallenge,
  Room,
  Vibe,
} from './types.js'

/**
 * Move Quest's soul lives here: meaningful, photogenic prompts that get you
 * off your chair and into another room. Every challenge is tagged with the
 * room it lives in and a vibe used for feed framing. Difficulty is an effort
 * ladder — Easy (quick reach), Medium (another room / small task), Hard (leave
 * the building / connect with people).
 *
 * A few originals are spelled out in full (stable ids the tests rely on); the
 * bulk of the pool comes from the compact SEEDS list below, expanded by
 * `buildSeeds` so each is a single readable line.
 */
const CURATED: Challenge[] = [
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

/** [title, prompt, difficulty, room, vibe] — expanded into full challenges. */
type Seed = readonly [string, string, Difficulty, Room, Vibe]

const SEEDS: Seed[] = [
  // ---------------- EASY — a quick stretch away from the desk --------------
  ['Fresh tea', 'Brew a cup of tea and photograph it steaming.', 'easy', 'kitchen', 'hydrate'],
  ['Coffee run', 'Make a coffee and photograph the full cup.', 'easy', 'kitchen', 'hydrate'],
  ['Fill the kettle', 'Fill the kettle and set it to boil — photograph it.', 'easy', 'kitchen', 'hydrate'],
  ['Cold glass', 'Pour a cold drink and photograph the glass.', 'easy', 'kitchen', 'hydrate'],
  ['Piece of fruit', 'Grab a piece of fruit and photograph it in your hand.', 'easy', 'kitchen', 'hydrate'],
  ['Top up your bottle', 'Refill your water bottle to the brim and photograph it.', 'easy', 'kitchen', 'hydrate'],
  ['Handful of something', 'Pour a small snack into a bowl and photograph it.', 'easy', 'kitchen', 'craft'],
  ['Straight from the tap', 'Photograph a glass filling under the tap.', 'easy', 'kitchen', 'hydrate'],
  ['Herbal steep', 'Steep a herbal tea and photograph its colour.', 'easy', 'kitchen', 'hydrate'],
  ['Plate a snack', 'Put a snack on a plate and photograph it.', 'easy', 'kitchen', 'craft'],
  ["Today's sky", 'Photograph the sky from your nearest window.', 'easy', 'window', 'nature'],
  ['Passing cloud', 'Photograph a cloud you can see right now.', 'easy', 'window', 'nature'],
  ['Light on the wall', 'Photograph sunlight landing on a wall or floor.', 'easy', 'window', 'nature'],
  ['Rooftops', 'Photograph the rooftops or skyline outside.', 'easy', 'window', 'nature'],
  ['Weather report', 'Photograph what the weather is doing outside.', 'easy', 'window', 'nature'],
  ['Silhouette', 'Photograph something backlit by a window.', 'easy', 'window', 'craft'],
  ['Through the glass', 'Photograph the ground or street through the window.', 'easy', 'window', 'nature'],
  ['Open the blinds', 'Open a blind or curtain and photograph the light it lets in.', 'easy', 'window', 'nature'],
  ['Leaf detail', 'Photograph a leaf close enough to see its veins.', 'easy', 'lounge', 'nature'],
  ['Nearest plant', 'Photograph the plant closest to you.', 'easy', 'lounge', 'nature'],
  ['New growth', 'Photograph a bud, sprout, or new leaf.', 'easy', 'lounge', 'nature'],
  ['Fresh flowers', 'Photograph any flowers you can find.', 'easy', 'lounge', 'nature'],
  ['Straighten the shelf', 'Line up a few books and photograph the shelf.', 'easy', 'lounge', 'tidy'],
  ['Plump the cushions', 'Fluff the cushions and photograph the sofa.', 'easy', 'lounge', 'tidy'],
  ['One thing home', 'Put one stray object where it belongs and photograph it.', 'easy', 'lounge', 'tidy'],
  ['Tuck a cable', 'Tuck away a loose cable and photograph the result.', 'easy', 'lounge', 'tidy'],
  ['Clear your desk', 'Clear one thing off your own desk and photograph the space.', 'easy', 'anywhere', 'tidy'],
  ['Water the plant', 'Give a plant a little water and photograph it.', 'easy', 'lounge', 'nature'],
  ['Stand and reach', 'Stand up, reach for the ceiling, and photograph above you.', 'easy', 'anywhere', 'movement'],
  ['To the door', 'Walk to the nearest door and photograph the handle.', 'easy', 'hallway', 'movement'],
  ['Ten steps out', 'Walk ten steps from your seat and photograph where you land.', 'easy', 'hallway', 'movement'],
  ['Farthest wall', 'Walk to the farthest wall in sight and photograph it.', 'easy', 'hallway', 'movement'],
  ['Down the hall', 'Photograph the length of a hallway or corridor.', 'easy', 'hallway', 'movement'],
  ['Find an exit', 'Photograph the nearest exit sign or doorway.', 'easy', 'hallway', 'movement'],
  ['Stand in a doorway', 'Photograph the view while standing in a doorway.', 'easy', 'hallway', 'movement'],
  ['Loop the room', 'Walk a full lap of the room and photograph your start point.', 'easy', 'hallway', 'movement'],
  ['Reach for light', 'Photograph a lamp or light source turned on.', 'easy', 'anywhere', 'craft'],
  ['Something round', 'Photograph a perfectly round object near you.', 'easy', 'anywhere', 'craft'],
  ['Something blue', 'Photograph a blue object you can reach.', 'easy', 'anywhere', 'craft'],
  ['Something green', 'Photograph a green object or plant.', 'easy', 'anywhere', 'nature'],
  ['Your hands', 'Photograph your own hands doing something.', 'easy', 'anywhere', 'craft'],
  ['A good pen', 'Photograph a pen or tool you like using.', 'easy', 'anywhere', 'craft'],
  ['Sticky note', 'Photograph a note or message on a board.', 'easy', 'anywhere', 'social'],
  ['A colleague’s mug', 'Photograph a fun mug that isn’t yours (ask first).', 'easy', 'anywhere', 'social'],
  ['Windowsill', 'Photograph what sits on a windowsill.', 'easy', 'window', 'nature'],
  ['Interesting shadow', 'Photograph an interesting shadow indoors.', 'easy', 'anywhere', 'craft'],
  ['Nearby reflection', 'Photograph your reflection in a screen or glass.', 'easy', 'anywhere', 'craft'],
  ['A tidy corner', 'Photograph a tidy corner of the room.', 'easy', 'lounge', 'tidy'],
  ['Texture', 'Photograph an interesting texture within arm’s reach.', 'easy', 'anywhere', 'craft'],
  ['Clock check', 'Photograph the nearest clock.', 'easy', 'anywhere', 'craft'],
  ['Crack a window', 'Open a window a crack and photograph the outside.', 'easy', 'window', 'fresh-air'],
  ['Stretch break', 'Stand up to stretch and photograph your feet on the floor.', 'easy', 'anywhere', 'movement'],
  ['Cup of pens', 'Photograph a cup or pot of pens and tools.', 'easy', 'anywhere', 'craft'],
  ['Fruit bowl', 'Photograph a bowl of fruit.', 'easy', 'kitchen', 'hydrate'],
  ['Open book', 'Photograph an open book or notebook page.', 'easy', 'lounge', 'craft'],
  ['Warmest lamp', 'Photograph the warmest light in the room.', 'easy', 'lounge', 'craft'],
  ['Favourite mug', 'Photograph your favourite mug.', 'easy', 'kitchen', 'hydrate'],
  ['Warm in both hands', 'Photograph a warm drink held in both hands.', 'easy', 'kitchen', 'hydrate'],
  ['Doormat', 'Photograph the nearest doormat or entrance floor.', 'easy', 'hallway', 'movement'],
  ['Straight lines', 'Photograph a set of straight lines around you.', 'easy', 'anywhere', 'craft'],
  ['Fold a cloth', 'Fold a napkin or cloth neatly and photograph it.', 'easy', 'kitchen', 'tidy'],
  ['Window latch', 'Photograph a window latch or handle.', 'easy', 'window', 'craft'],
  ['Something old', 'Photograph the oldest object within reach.', 'easy', 'anywhere', 'craft'],
  ['A single flower', 'Photograph one flower on its own.', 'easy', 'lounge', 'nature'],

  // ---------------- MEDIUM — another room, a few minutes -------------------
  ['Make a proper snack', 'Prepare a small snack from scratch and photograph it.', 'medium', 'kitchen', 'craft'],
  ['Brew for two', 'Make two drinks and photograph them side by side.', 'medium', 'kitchen', 'social'],
  ['Slice of fruit', 'Slice a piece of fruit neatly and photograph it.', 'medium', 'kitchen', 'craft'],
  ['Fill the jug', 'Fill a water jug for the table and photograph it.', 'medium', 'kitchen', 'hydrate'],
  ['Wash up', 'Wash a few dishes and photograph the clean rack.', 'medium', 'kitchen', 'tidy'],
  ['Wipe the counter', 'Wipe down a counter and photograph it clean.', 'medium', 'kitchen', 'tidy'],
  ['Make toast', 'Make toast and photograph it on a plate.', 'medium', 'kitchen', 'craft'],
  ['Plate it nicely', 'Plate some food attractively and photograph it.', 'medium', 'kitchen', 'craft'],
  ['Coffee, properly', 'Photograph coffee being made — pour, press, or machine.', 'medium', 'kitchen', 'craft'],
  ['Tea for the team', 'Offer to make tea and photograph the round.', 'medium', 'kitchen', 'social'],
  ['Take the stairs up', 'Walk up a flight of stairs and photograph the top.', 'medium', 'hallway', 'movement'],
  ['Take the stairs down', 'Walk down a flight of stairs and photograph the bottom.', 'medium', 'hallway', 'movement'],
  ['Corridor walk', 'Walk the longest corridor you can and photograph the end.', 'medium', 'hallway', 'movement'],
  ['Another floor', 'Go to a different floor and photograph where you arrive.', 'medium', 'hallway', 'movement'],
  ['Find the fire exit', 'Locate a fire exit and photograph the sign.', 'medium', 'hallway', 'movement'],
  ['Lift lobby', 'Photograph a lift lobby or stairwell.', 'medium', 'hallway', 'movement'],
  ['Reception', 'Walk to a reception or entrance area and photograph it.', 'medium', 'hallway', 'movement'],
  ['Empty meeting room', 'Photograph an empty meeting room.', 'medium', 'hallway', 'movement'],
  ['Reset a surface', 'Fully tidy one small surface and photograph the after.', 'medium', 'lounge', 'tidy'],
  ['Fold a blanket', 'Fold a throw or blanket and photograph it.', 'medium', 'lounge', 'tidy'],
  ['Level a frame', 'Straighten a picture frame and photograph it.', 'medium', 'lounge', 'tidy'],
  ['Arrange three things', 'Arrange three objects into a still life and photograph it.', 'medium', 'lounge', 'craft'],
  ['Books by colour', 'Arrange a few books by colour and photograph them.', 'medium', 'lounge', 'tidy'],
  ['Empty the bin', 'Empty a small bin and photograph the fresh liner.', 'medium', 'lounge', 'tidy'],
  ['Recycle run', 'Take something to recycling and photograph the bin.', 'medium', 'hallway', 'tidy'],
  ['Clear the sink', 'Clear a sink of cups and photograph it empty.', 'medium', 'kitchen', 'tidy'],
  ['Open wide', 'Open a window fully and photograph the view.', 'medium', 'window', 'fresh-air'],
  ['Biggest plant', 'Find the biggest plant in the building and photograph it.', 'medium', 'lounge', 'nature'],
  ['Sunniest spot', 'Find the sunniest spot inside and photograph it.', 'medium', 'window', 'nature'],
  ['Fresh herbs', 'Photograph fresh herbs or flowers up close.', 'medium', 'kitchen', 'nature'],
  ['By an open door', 'Stand by an open door or balcony and photograph out.', 'medium', 'window', 'fresh-air'],
  ['A different window', 'Photograph the sky from a window you don’t usually use.', 'medium', 'window', 'nature'],
  ['Team plant', 'Photograph the plant everyone in the space shares.', 'medium', 'lounge', 'nature'],
  ['Whiteboard', 'Photograph a whiteboard with something on it.', 'medium', 'anywhere', 'social'],
  ['A tidy setup', 'Photograph a colleague’s tidy desk (ask first).', 'medium', 'anywhere', 'social'],
  ['Shared space', 'Photograph a shared table or breakout area.', 'medium', 'lounge', 'social'],
  ['Pattern hunt', 'Photograph a repeating pattern you walked to find.', 'medium', 'anywhere', 'craft'],
  ['Colour pop', 'Photograph the most colourful object on another floor.', 'medium', 'hallway', 'craft'],
  ['Interesting cover', 'Walk to a bookshelf and photograph an interesting cover.', 'medium', 'lounge', 'craft'],
  ['Noticeboard', 'Photograph a noticeboard or shared wall.', 'medium', 'anywhere', 'social'],
  ['Art on the wall', 'Photograph a piece of art or a poster in the building.', 'medium', 'hallway', 'craft'],
  ['Refill the dispenser', 'Refill a shared water jug or dispenser and photograph it.', 'medium', 'kitchen', 'hydrate'],
  ['Coffee machine', 'Photograph the shared coffee machine mid-brew.', 'medium', 'kitchen', 'social'],
  ['Ready the table', 'Clean a shared table and photograph it ready to use.', 'medium', 'lounge', 'tidy'],
  ['Push in the chairs', 'Push in the chairs at a table and photograph it.', 'medium', 'lounge', 'tidy'],
  ['Pot a cutting', 'Photograph a cutting or small pot you just set up.', 'medium', 'lounge', 'nature'],
  ['Stairwell light', 'Photograph the light in a stairwell.', 'medium', 'hallway', 'movement'],
  ['Long shadow', 'Walk to find a long shadow and photograph it.', 'medium', 'anywhere', 'craft'],
  ['Framed doorway', 'Photograph a doorway framing a view beyond it.', 'medium', 'hallway', 'craft'],
  ['Kitchenette', 'Walk to a shared kitchen area and photograph it.', 'medium', 'kitchen', 'social'],
  ['Symmetry indoors', 'Photograph something arranged symmetrically.', 'medium', 'anywhere', 'craft'],
  ['Straighten the frames', 'Level a row of frames or posters and photograph them.', 'medium', 'hallway', 'tidy'],
  ['Water round', 'Water two or three plants and photograph the last one.', 'medium', 'lounge', 'nature'],
  ['A quiet room', 'Find a quiet room you can reach and photograph it.', 'medium', 'hallway', 'movement'],
  ['The far side', 'Walk to the far side of your floor and photograph it.', 'medium', 'hallway', 'movement'],
  ['Warm drink for two', 'Make a drink for someone else and photograph both cups.', 'medium', 'kitchen', 'social'],
  ['Snack for sharing', 'Plate a snack to share and photograph it.', 'medium', 'kitchen', 'social'],
  ['A clean window', 'Wipe a small window or mirror and photograph it clear.', 'medium', 'window', 'tidy'],
  ['Books upright', 'Stand a fallen stack of books upright and photograph them.', 'medium', 'lounge', 'tidy'],
  ['A made bed of cushions', 'Arrange the cushions neatly and photograph the sofa.', 'medium', 'lounge', 'tidy'],
  ['Longest sightline', 'Photograph the longest straight view you can walk to.', 'medium', 'hallway', 'movement'],
  ['A plant that needs help', 'Find a struggling plant, tend it, and photograph it.', 'medium', 'lounge', 'nature'],
  ['Someone else’s view', 'Photograph the view from a window on another floor.', 'medium', 'window', 'nature'],
  ['Tidy the cables', 'Bundle a nest of cables and photograph the result.', 'medium', 'anywhere', 'tidy'],

  // ---------------- HARD — leave the building or connect ------------------
  ['Round the block', 'Walk around the building and photograph the far side.', 'hard', 'outdoors', 'fresh-air'],
  ['Find a tree', 'Walk to the nearest tree and photograph its trunk or canopy.', 'hard', 'outdoors', 'nature'],
  ['Touch grass', 'Photograph your shoes standing on grass.', 'hard', 'outdoors', 'nature'],
  ['The entrance', 'Photograph the main entrance from outside.', 'hard', 'outdoors', 'fresh-air'],
  ['Street level', 'Photograph the street outside the building.', 'hard', 'outdoors', 'fresh-air'],
  ['A parked bike', 'Photograph a bicycle outside.', 'hard', 'outdoors', 'movement'],
  ['Fresh-air selfie', 'Take a selfie outdoors with the sky behind you.', 'hard', 'outdoors', 'fresh-air'],
  ['Nearest bench', 'Walk to a bench and photograph it.', 'hard', 'outdoors', 'fresh-air'],
  ['An interesting door', 'Photograph an interesting front door outside.', 'hard', 'outdoors', 'craft'],
  ['Other side of the street', 'Photograph the building from across the road.', 'hard', 'outdoors', 'fresh-air'],
  ['Find water outside', 'Photograph a fountain, puddle, river, or tap outdoors.', 'hard', 'outdoors', 'nature'],
  ['Look up outside', 'Outside, photograph the top of the tallest thing you see.', 'hard', 'outdoors', 'fresh-air'],
  ['Around the corner', 'Walk to the nearest corner and photograph what’s around it.', 'hard', 'outdoors', 'movement'],
  ['Sky, no glass', 'Photograph the open sky with no window in the way.', 'hard', 'outdoors', 'nature'],
  ['A flower outside', 'Photograph a flower growing outdoors.', 'hard', 'outdoors', 'nature'],
  ['Nearest green', 'Walk to the nearest patch of green and photograph it.', 'hard', 'outdoors', 'nature'],
  ['Real weather', 'Step outside and photograph the actual weather.', 'hard', 'outdoors', 'fresh-air'],
  ['A front garden', 'Photograph a front garden or planted bed outside.', 'hard', 'outdoors', 'nature'],
  ['Two flights', 'Climb two flights of stairs and photograph the top landing.', 'hard', 'hallway', 'movement'],
  ['Top floor', 'Get to the highest floor you can and photograph the view.', 'hard', 'window', 'movement'],
  ['Ground floor', 'Go all the way down and photograph the lobby.', 'hard', 'hallway', 'movement'],
  ['The long way', 'Take the long way to anywhere and photograph your arrival.', 'hard', 'hallway', 'movement'],
  ['Lap of the floor', 'Walk a full loop of your floor and photograph the start.', 'hard', 'hallway', 'movement'],
  ['Farthest window', 'Walk to the farthest window in the building and photograph out.', 'hard', 'window', 'movement'],
  ['Best view you can reach', 'Find the best view in the building and photograph it.', 'hard', 'window', 'nature'],
  ['A door you never use', 'Photograph a door you’ve never walked through.', 'hard', 'hallway', 'movement'],
  ['Wave to someone', 'Greet someone and photograph a friendly wave.', 'hard', 'anywhere', 'social'],
  ['Team selfie', 'Get two or more people into a selfie.', 'hard', 'anywhere', 'social'],
  ['High five', 'Photograph a high five in action.', 'hard', 'anywhere', 'social'],
  ['Coffee with someone', 'Make drinks with a colleague and photograph both cups.', 'hard', 'kitchen', 'social'],
  ['Meet someone new', 'Introduce yourself to someone and photograph where they sit (ask first).', 'hard', 'anywhere', 'social'],
  ['Desk visit', 'Visit a colleague’s desk and photograph something you liked.', 'hard', 'anywhere', 'social'],
  ['Group shot', 'Photograph three or more people together.', 'hard', 'anywhere', 'social'],
  ['Pass it on', 'Photograph handing something to a colleague.', 'hard', 'anywhere', 'social'],
  ['Ask a question', 'Walk over to ask someone something and photograph their space.', 'hard', 'anywhere', 'social'],
  ['Frame within a frame', 'Photograph a scene framed by a doorway or window.', 'hard', 'anywhere', 'craft'],
  ['Leading lines', 'Photograph strong leading lines — rails, floors, or roads.', 'hard', 'outdoors', 'craft'],
  ['Shadow play', 'Photograph a dramatic shadow you went to find.', 'hard', 'outdoors', 'craft'],
  ['Symmetry outside', 'Photograph a symmetrical scene outdoors.', 'hard', 'outdoors', 'craft'],
  ['Something tiny', 'Photograph the smallest interesting detail you can find.', 'hard', 'anywhere', 'craft'],
  ['Golden light', 'Photograph the best natural light you can find.', 'hard', 'window', 'nature'],
  ['Colour story', 'Photograph three things of the same colour, arranged.', 'hard', 'anywhere', 'craft'],
  ['Look down', 'Photograph an interesting floor or ground pattern.', 'hard', 'outdoors', 'craft'],
  ['Look way up', 'Photograph a ceiling, sky, or canopy directly above you.', 'hard', 'outdoors', 'nature'],
  ['Something moving', 'Photograph something in motion — traffic, people, or leaves.', 'hard', 'outdoors', 'movement'],
  ['The horizon', 'Photograph the farthest point you can see.', 'hard', 'outdoors', 'nature'],
  ['Street art', 'Photograph a mural, sticker, or street art outside.', 'hard', 'outdoors', 'craft'],
  ['A friendly dog', 'Photograph a friendly dog outside (ask the owner first).', 'hard', 'outdoors', 'social'],
  ['Water feature', 'Photograph a fountain, pond, or water feature.', 'hard', 'outdoors', 'nature'],
  ['The busiest spot', 'Photograph the busiest area you can walk to.', 'hard', 'anywhere', 'social'],
  ['The quietest spot', 'Find the quietest place you can reach and photograph it.', 'hard', 'anywhere', 'movement'],
  ['Nature intruding', 'Photograph a plant or moss growing where it shouldn’t.', 'hard', 'outdoors', 'nature'],
  ['Reflection of you, outside', 'Photograph your reflection somewhere unexpected outdoors.', 'hard', 'outdoors', 'craft'],
  ['An outdoor path', 'Photograph a long outdoor path or walkway.', 'hard', 'outdoors', 'movement'],
  ['Something red outside', 'Walk outside and photograph something red.', 'hard', 'outdoors', 'craft'],
  ['A big sky', 'Photograph the widest stretch of sky you can find.', 'hard', 'outdoors', 'fresh-air'],
  ['Meet the neighbours', 'Photograph the building or shop next door.', 'hard', 'outdoors', 'social'],
  ['A long walk back', 'Walk somewhere and photograph the route back.', 'hard', 'outdoors', 'movement'],
  ['Bring something back', 'Bring back a leaf or flower from outside and photograph it.', 'hard', 'outdoors', 'nature'],
  ['Say thanks', 'Thank someone in person and photograph a shared moment.', 'hard', 'anywhere', 'social'],
  ['A view from up high', 'Photograph a view looking down from a height you climbed to.', 'hard', 'window', 'movement'],
  ['Fresh air, five minutes', 'Spend five minutes outside and photograph where you stood.', 'hard', 'outdoors', 'fresh-air'],
  ['A tree with character', 'Find an unusual or characterful tree and photograph it.', 'hard', 'outdoors', 'nature'],
  ['The oldest thing outside', 'Photograph the oldest-looking thing you can find outdoors.', 'hard', 'outdoors', 'craft'],
]

const POINTS: Record<Difficulty, number> = { easy: 10, medium: 25, hard: 50 }

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function buildSeeds(seeds: Seed[], reservedIds: string[]): Challenge[] {
  const used = new Set(reservedIds)
  return seeds.map(([title, prompt, difficulty, room, vibe]) => {
    const slug = slugify(title)
    let id = `ch_${slug}`
    let n = 2
    while (used.has(id)) id = `ch_${slug}-${n++}`
    used.add(id)
    return {
      id,
      slug,
      title,
      prompt,
      difficulty,
      room,
      vibe,
      points: POINTS[difficulty],
      criteria: [{ id: 'subject_visible', description: `The photo clearly shows: ${title.toLowerCase()}` }],
      active: true,
    }
  })
}

export const CHALLENGES: Challenge[] = [
  ...CURATED,
  ...buildSeeds(SEEDS, CURATED.map((c) => c.id)),
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
