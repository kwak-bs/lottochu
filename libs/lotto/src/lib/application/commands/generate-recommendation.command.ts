/**
 * 로또 번호 추천 생성 Command
 */
export class GenerateRecommendationCommand {
  constructor(
    /** 대상 회차 (다음 회차 번호) */
    public readonly targetDrawId: number,
  ) {}
}
