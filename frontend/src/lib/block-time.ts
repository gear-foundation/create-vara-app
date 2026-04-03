/** Convert block count to human-readable time string (Vara ~3s blocks). */
export function blocksToHumanTime(blocks: number): string {
  const seconds = blocks * 3;
  if (seconds < 60) return "<1 min";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `~${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `~${hours}h`;
}
