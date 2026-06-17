export function enforceLinkBudget(
  rels: {source_id: string; link: string; target_id: string}[],
  maxOutgoing: number = 2
): {source_id: string; link: string; target_id: string}[] {
  const counts: Record<string, number> = {};
  return rels.filter(r => {
    counts[r.source_id] = (counts[r.source_id] || 0) + 1;
    return counts[r.source_id] <= maxOutgoing;
  });
}
