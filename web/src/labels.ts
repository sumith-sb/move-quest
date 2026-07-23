import {
  CookingPot,
  Footprints,
  type LucideIcon,
  PanelTop,
  Sofa,
  Sparkles,
  Trees,
} from 'lucide-react'
import type { Difficulty, Room } from './types'

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

export const ROOM_LABEL: Record<Room, string> = {
  kitchen: 'Kitchen',
  window: 'Window',
  outdoors: 'Outdoors',
  hallway: 'Hallway',
  lounge: 'Lounge',
  anywhere: 'Anywhere',
}

export const ROOM_ICON: Record<Room, LucideIcon> = {
  kitchen: CookingPot,
  window: PanelTop,
  outdoors: Trees,
  hallway: Footprints,
  lounge: Sofa,
  anywhere: Sparkles,
}

export function timeAgo(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime())
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
