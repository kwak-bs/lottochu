# pension

연금복권720+ 전용 모듈입니다. 동행복권 `pt720` API 연동, 추천 생성, 당첨 결과 확인, 수동 발송 API를 제공합니다.

## 주요 역할

- `SyncPensionDrawsCommand`: 회차 범위 당첨 데이터 동기화
- `GeneratePensionRecommendationCommand`: 추천 5게임 생성
  - 현재는 통계 기반 5게임만 생성
  - `ai` 필드는 빈 배열로 반환
- `CheckPensionResultsCommand`: 추천 데이터와 당첨 데이터 비교 후 결과 저장
- `PensionController`: 수동 운영용 REST 엔드포인트 제공

## API

- `POST /pension/sync` - 당첨 데이터 동기화
- `GET /pension/draws` - 전체 회차 조회
- `GET /pension/draws/latest` - 최신 회차 조회
- `GET /pension/status` - 동기화 상태
- `POST /pension/recommend` - 추천 번호 생성
- `POST /pension/recommend/send` - 추천 생성 후 텔레그램 발송
- `POST /pension/result/check-and-send` - 최신 결과 체크 후 텔레그램 발송

## 스케줄(자동 실행 기준)

- 금요일 12:00 - 결과 확인 및 Telegram 발송
- 금요일 12:30 - 추천 생성 및 Telegram 발송
- 금요일 13:00 - DB(통계) 갱신 + 동기화 알림 전송

## 저장 테이블

- `pension_draws`
- `pension_recommendations`
- `pension_results`
