/**
 * 연금복권720+ 당첨 등수를 계산한다.
 *
 * 보너스 번호는 현재 PensionDraw 모델에 저장되지 않으므로 8등은 별도로
 * 판정할 수 없다.
 */
export function calculatePensionPrizeRank(
  recommendationGroup: number,
  recommendationDigits: string,
  winningGroup: number | null,
  winningDigits: string | null,
): number | null {
  if (winningDigits == null || winningDigits.length !== 6) return null;
  if (recommendationDigits.length !== 6) return null;

  if (
    winningGroup != null &&
    recommendationGroup === winningGroup &&
    recommendationDigits === winningDigits
  ) {
    return 1;
  }

  // 2등은 1등 번호와 6자리가 같고 조만 다른 경우다.
  if (recommendationDigits === winningDigits) return 2;

  // 3~7등은 오른쪽 끝부터 각각 5~1자리가 일치하는 경우다.
  for (let suffixLength = 5; suffixLength >= 1; suffixLength--) {
    if (
      recommendationDigits.slice(-suffixLength) ===
      winningDigits.slice(-suffixLength)
    ) {
      return 8 - suffixLength;
    }
  }

  return null;
}
