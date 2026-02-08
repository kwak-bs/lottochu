/**
 * 연금복권 당첨 데이터 동기화 Command
 */
export class SyncPensionDrawsCommand {
  constructor(
    public readonly startDrawId?: number,
    public readonly endDrawId?: number,
  ) {}
}
