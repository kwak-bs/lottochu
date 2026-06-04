# statistics

통계 분석 모듈입니다. 로또 번호 출현 빈도와 연금 자리수 빈도를 계산합니다.

## 제공 API

- `GET /statistics` - 전체 통계
- `GET /statistics/candidates?exclude=20` - 하위 빈도 번호 제외 후보
- `GET /statistics/most-frequent` - 최다 출현 TOP 10
- `GET /statistics/least-frequent` - 최소 출현 TOP 10

## 핵심 기능

- 로또
  - `lotto_draws` 기준으로 번호별 출현 횟수/비율/마지막 출현 회차 계산
  - 하위 N개 번호 제외 후보 리스트 생성 (`getCandidateNumbers`)
- 연금
  - `pension_draws.digits` 기준으로 자리별(1~6) 숫자(0~9) 출현 빈도 계산
  - 순위 기반 추천 6자리 조합 반환 (`getRecommendedPensionDigitsRanked`)
