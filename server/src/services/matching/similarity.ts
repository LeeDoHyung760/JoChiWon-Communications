export function normalizeValues(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value): value is string => typeof value === 'string').map(value => value.trim()).filter(Boolean))];
}

export function intersection(left: string[], right: string[]): string[] {
  const rightSet = new Set(normalizeValues(right).map(value => value.toLocaleLowerCase('ko-KR')));
  return normalizeValues(left).filter(value => rightSet.has(value.toLocaleLowerCase('ko-KR')));
}

export function jaccardSimilarity(left: string[], right: string[]): number {
  const a = new Set(normalizeValues(left).map(value => value.toLocaleLowerCase('ko-KR')));
  const b = new Set(normalizeValues(right).map(value => value.toLocaleLowerCase('ko-KR')));
  if (!a.size && !b.size) return 0;
  const common = [...a].filter(value => b.has(value)).length;
  return (common / new Set([...a, ...b]).size) * 100;
}
