# shared

공통 모듈입니다. 설정, 외부 API 클라이언트, 날짜 유틸을 제공합니다.

## 포함 구성

- `config`
  - `database.config.ts` - DB 연결 설정
  - `app.config.ts` - 앱 공통 설정
- `clients`
  - `DhLotteryClient` - 로또 당첨 API 연동
  - `DhPensionClient` - 연금 당첨 API 연동
- `utils`
  - `getNextWeekday()`
  - `getNextSaturday()`
  - `getNextThursday()`

## 참고

- 스케줄러와 컨트롤러에서 추첨일 계산 시 `getNextSaturday`, `getNextThursday`를 사용합니다.
