# Lottochu 운영 체크리스트

머지/배포 직후 빠르게 상태를 확인하기 위한 최소 점검 목록.

## 1) 기본 서비스 확인

- PostgreSQL 포트 확인 (`127.0.0.1:5432`)
- Ollama 상태 확인 (`http://127.0.0.1:11434/api/tags`)
- API 헬스체크 (`GET /`)

## 2) 동기화 및 상태 확인

- `POST /lotto/sync`
- `POST /pension/sync`
- `GET /lotto/status` 최신 회차 확인
- `GET /pension/status` 최신 회차 확인

## 3) 추천/결과 스모크 테스트

- `POST /lotto/recommend/send`
- `POST /pension/recommend/send`
- `POST /lotto/result/check-and-send`
- `POST /pension/result/check-and-send`

## 4) 텔레그램 확인 포인트

- 추천 메시지: 회차, 번호 포맷, 발송 성공 여부
- 결과 메시지: 게임별 등수/당첨금 표기, 낙첨 표기

## PowerShell 예시

```powershell
$base = 'http://127.0.0.1:3000'

Invoke-RestMethod -Method Post -Uri "$base/lotto/sync"
Invoke-RestMethod -Method Post -Uri "$base/pension/sync"

Invoke-RestMethod -Method Get -Uri "$base/lotto/status"
Invoke-RestMethod -Method Get -Uri "$base/pension/status"

Invoke-RestMethod -Method Post -Uri "$base/lotto/recommend/send"
Invoke-RestMethod -Method Post -Uri "$base/pension/recommend/send"

Invoke-RestMethod -Method Post -Uri "$base/lotto/result/check-and-send"
Invoke-RestMethod -Method Post -Uri "$base/pension/result/check-and-send"
```
