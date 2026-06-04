# lotto

로또 도메인 모듈입니다. 당첨 데이터 동기화, 추천 생성, 결과 채점, 수동 발송 API를 제공합니다.

## 주요 역할

- `SyncDrawsCommand`: 동행복권 로또 당첨 데이터 동기화
- `GenerateRecommendationCommand`: 추천 5게임 생성
  - 통계 3게임: 하위 빈도 번호 제외 후 랜덤
  - AI 2게임: Ollama 기반 추천
- `CheckResultsCommand`: 추천 번호와 실제 당첨번호 비교 후 결과 저장
- `LottoController`: 수동 운영용 REST 엔드포인트 제공

## API

- `POST /lotto/sync` - 당첨 데이터 동기화 (`?start=&end=`)
- `GET /lotto/draws` - 전체 회차 조회
- `GET /lotto/draws/latest` - 최신 회차 조회
- `GET /lotto/status` - 동기화 상태 조회
- `POST /lotto/recommend` - 추천 생성 (`?draw=`)
- `POST /lotto/recommend/send` - 추천 생성 후 텔레그램 발송
- `POST /lotto/result/check-and-send` - 최신 결과 체크 후 텔레그램 발송

## 저장 테이블

- `lotto_draws`
- `lotto_recommendations`
- `lotto_results`
