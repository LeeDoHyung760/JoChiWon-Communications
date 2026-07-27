const dimensions = [[0], [1], [2], [3]] as const;

// MBTI는 성격의 절대적 판단이 아니라 매칭 점수의 작은 참고 요소로만 사용합니다.
export function calculateMbtiScore(first?: string, second?: string): number {
  const a = (first ?? '').trim().toUpperCase();
  const b = (second ?? '').trim().toUpperCase();
  if (!/^[EI][NS][TF][JP]$/.test(a) || !/^[EI][NS][TF][JP]$/.test(b)) return 50;
  const sameDimensions = dimensions.filter(([index]) => a[index] === b[index]).length;
  return [35, 50, 70, 85, 100][sameDimensions];
}
