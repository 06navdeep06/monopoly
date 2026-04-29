/** Player color palette for game pieces */
export const PLAYER_COLORS = [
  { id: 'red', hex: '#EF4444', label: 'Red' },
  { id: 'blue', hex: '#3B82F6', label: 'Blue' },
  { id: 'green', hex: '#10B981', label: 'Green' },
  { id: 'yellow', hex: '#F59E0B', label: 'Yellow' },
  { id: 'purple', hex: '#8B5CF6', label: 'Purple' },
  { id: 'pink', hex: '#EC4899', label: 'Pink' },
  { id: 'orange', hex: '#F97316', label: 'Orange' },
  { id: 'cyan', hex: '#06B6D4', label: 'Cyan' },
] as const;

export type PlayerColorId = (typeof PLAYER_COLORS)[number]['id'];

/** Get color hex by id */
export function getColorHex(id: string): string {
  return PLAYER_COLORS.find((c) => c.id === id)?.hex ?? '#F59E0B';
}
