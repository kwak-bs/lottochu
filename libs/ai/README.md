# ai

AI 추천 모듈입니다. Ollama를 호출해 로또 번호 추천을 생성합니다.

## 환경변수

- `OLLAMA_BASE_URL` (기본값: `http://localhost:11434`)
- `OLLAMA_MODEL` (기본값: `llama3.2:latest`)

## 구성

- `AiService`
  - 최근 당첨 데이터 기반 추천 생성
  - Ollama 상태 확인
- `OllamaClient`
  - `/api/tags` 상태 체크
  - `/api/generate` 호출
  - 응답 JSON 파싱 및 유효성 검증
  - 실패 시 랜덤 fallback

## 참고

- Ollama 미가동 또는 응답 파싱 실패 시에도 fallback 번호를 반환해 추천 생성 흐름이 끊기지 않도록 설계되어 있습니다.
