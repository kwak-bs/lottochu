import { calculatePensionPrizeRank } from '@lottochu/pension';

describe('calculatePensionPrizeRank', () => {
  const winningDigits = '221540';

  it.each([
    [3, '221540', 3, 1],
    [1, '221540', 3, 2],
    [1, '921540', 3, 3],
    [1, '991540', 3, 4],
    [1, '999540', 3, 5],
    [1, '999940', 3, 6],
    [1, '999990', 3, 7],
    [1, '999999', 3, null],
  ])(
    'group %i and digits %s against %i조 returns rank %s',
    (group, digits, winningGroup, expected) => {
      expect(
        calculatePensionPrizeRank(group, digits, winningGroup, winningDigits),
      ).toBe(expected);
    },
  );

  it('returns null for incomplete winning data', () => {
    expect(calculatePensionPrizeRank(1, '123456', null, null)).toBeNull();
  });
});
