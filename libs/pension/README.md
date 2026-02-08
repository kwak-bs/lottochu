# pension

연금복권720+ 전용 모듈. 동행복권 pt720 API 연동, 추천 생성, 당첨 결과 확인, REST API 제공.

## API

- `POST /pension/sync` - 당첨 데이터 동기화
- `GET /pension/draws` - 전체 회차 조회
- `GET /pension/draws/latest` - 최신 회차 조회
- `GET /pension/status` - 동기화 상태
- `POST /pension/recommend` - 추천 번호 생성

## 스케줄

- 월요일 12:30 - 추천 생성 및 Telegram 발송
- 목요일 22:00 - 결과 확인 및 Telegram 발송
- 금요일 12:30 - DB(통계) 갱신
