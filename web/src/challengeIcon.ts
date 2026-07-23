import {
  Aperture,
  Armchair,
  Bike,
  BookOpen,
  Building2,
  Clock,
  Cloud,
  Coffee,
  DoorOpen,
  Flower2,
  Footprints,
  GlassWater,
  Hash,
  Heart,
  Leaf,
  Lightbulb,
  type LucideIcon,
  Palette,
  PanelTop,
  PenTool,
  Recycle,
  Sparkles,
  Sprout,
  Sun,
  TreePine,
  Type,
  Users,
  UtensilsCrossed,
  Waves,
} from 'lucide-react'
import { ROOM_ICON } from './labels'
import type { Challenge, Vibe } from './types'

type Rule = [LucideIcon, string[]]

// Ordered specific → general; the first keyword hit wins. Object cues beat
// colour cues so "a blue book" reads as a book, not a colour swatch.
const RULES: Rule[] = [
  [Hash, ['exactly ', 'number', 'how many', ' count']],
  [Type, ['letter', 'a word', 'sign that', 'word or sign']],
  [GlassWater, ['water', 'hydrate', 'glass of', 'bottle', 'the tap']],
  [Coffee, ['coffee', 'cup of tea', 'herbal', 'make tea', 'fresh tea', 'kettle', 'brew', 'mug', ' cup', 'teapot']],
  [UtensilsCrossed, ['snack', 'food', 'plate', 'toast', 'you made', 'made with', 'fruit', 'nuts', 'meal', 'dish']],
  [BookOpen, ['book', 'shelf', 'read', 'cover', 'notebook']],
  [PenTool, ['pen', 'sticky note', 'a note', 'marker', 'pencil']],
  [Armchair, ['cushion', 'sofa', 'chair', 'couch', 'seat', 'blanket']],
  [Lightbulb, ['lamp', 'bulb', 'light switch', 'candle']],
  [Bike, ['bike', 'bicycle', 'scooter']],
  [Clock, ['clock', 'watch', 'what time']],
  [DoorOpen, ['door', 'entrance', 'exit', 'a gate', 'threshold', 'doormat']],
  [TreePine, ['tree', 'trunk', 'canopy', 'branch', 'pinecone']],
  [Flower2, ['flower', 'petal', 'bloom', 'blossom', 'flower bed']],
  [Sprout, ['cutting', 'a pot', 'sapling', 'seed', 'new growth', 'sprout']],
  [Leaf, ['leaf', 'plant', 'moss', 'ivy', 'herb', 'bush', 'grass', 'nature', 'garden', 'hedge', 'green ']],
  [Waves, ['fountain', 'puddle', 'river', 'pond', 'water feature', 'reflection in water']],
  [Cloud, ['cloud', 'sky', 'weather', 'horizon']],
  [Sun, ['sunlight', 'sunbeam', 'golden', 'shadow', 'a sun', 'fresh air', 'bright light']],
  [PanelTop, ['window', 'the view', 'rooftop', 'skyline', 'blind', 'curtain']],
  [Footprints, ['stairs', 'steps', 'walk', 'corridor', 'hallway', 'loop', 'a lap', 'floor', 'a path', 'take the stairs', 'move']],
  [Building2, ['reception', 'lobby', 'meeting', 'lift', 'stairwell', 'street', 'brick', 'a wall', 'building', 'balcony', 'chimney', 'bus stop', 'lamppost']],
  [Users, ['colleague', 'someone', 'a team', 'people', 'wave', 'hello', 'high five', 'group', 'selfie', 'greet', 'handshake', 'fist bump', 'say thanks', 'friend', 'together', 'introduce']],
  [Sparkles, ['tidy', 'clear', 'organize', 'organise', 'fold', 'arrange', 'straighten', 'neat', 'reset']],
  [Recycle, ['recycle', 'the bin', 'a bin', 'rubbish']],
  [Aperture, ['reflection', 'mirror', 'symmetry', 'leading lines', 'pattern', 'composition', 'frame within', 'macro', 'silhouette', 'contrast', 'texture', 'diagonal', 'a curve', 'negative space', 'flat lay', 'surface']],
  [Heart, ['favourite', 'favorite', 'reminds you', 'you love']],
  [Palette, ['colour', 'color', 'red', 'blue', 'yellow', 'orange', 'pink', 'purple', 'teal', 'turquoise', 'gold', 'silver', 'green', 'something '] ],
]

const VIBE_ICON: Record<Vibe, LucideIcon> = {
  nature: Leaf,
  hydrate: GlassWater,
  tidy: Sparkles,
  craft: Aperture,
  social: Users,
  'fresh-air': Sun,
  movement: Footprints,
}

/** Pick an appropriate icon for a challenge from its text, then vibe, then room. */
export function iconForChallenge(
  challenge: Pick<Challenge, 'title' | 'prompt'> & Partial<Pick<Challenge, 'vibe' | 'room'>>,
): LucideIcon {
  const hay = `${challenge.title} ${challenge.prompt}`.toLowerCase()
  for (const [icon, keywords] of RULES) {
    if (keywords.some((k) => hay.includes(k))) return icon
  }
  const vibe = challenge.vibe ?? 'movement'
  const room = challenge.room ?? 'anywhere'
  return VIBE_ICON[vibe] ?? ROOM_ICON[room]
}
