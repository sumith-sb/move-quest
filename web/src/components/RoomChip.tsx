import { ROOM_ICON, ROOM_LABEL } from '../labels'
import type { Room } from '../types'

export function RoomChip({ room }: { room: Room }) {
  const Icon = ROOM_ICON[room]
  return (
    <span className="room-chip">
      <Icon size={14} strokeWidth={2} aria-hidden="true" />
      {ROOM_LABEL[room]}
    </span>
  )
}
