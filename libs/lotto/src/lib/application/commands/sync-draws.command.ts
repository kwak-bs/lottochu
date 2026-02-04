/**
 * 동행복권에서 당첨 번호를 동기화하는 Command
 */
export class SyncDrawsCommand {
  constructor(
    /** 동기화할 시작 회차 (없으면 1부터) */
    public readonly startDrawId?: number,
    /** 동기화할 끝 회차 (없으면 최신까지) */
    public readonly endDrawId?: number,
  ) {}
}
