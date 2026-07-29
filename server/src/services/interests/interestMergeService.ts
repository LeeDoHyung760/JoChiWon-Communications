import type { InterestId } from './interestCatalog.js';
export function mergeInterests(
  explicit: InterestId[],
  inferred: Array<{ id: InterestId; confidence: number }>,
) {
  const explicitSet = new Set(explicit);
  return {
    explicit: [...explicitSet],
    inferred: inferred.filter(item => !explicitSet.has(item.id)).sort((a, b) => b.confidence - a.confidence),
    combined: [...explicitSet, ...inferred.filter(item => !explicitSet.has(item.id)).sort((a, b) => b.confidence - a.confidence).map(item => item.id)],
  };
}
