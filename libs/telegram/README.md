# telegram

텔레그램 메시지 전송 모듈입니다. 로또/연금 추천 및 결과 메시지를 HTML 포맷으로 발송합니다.

## 환경변수

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

둘 중 하나라도 없으면 전송은 비활성화되고, 로그만 남깁니다.

## 제공 기능

- `sendMessage(message)` - 일반 메시지 전송
- `sendRecommendation(data)` - 로또 추천 메시지 전송
- `sendResult(data)` - 로또 결과 메시지 전송
- `sendPensionRecommendation(data)` - 연금 추천 메시지 전송
- `sendPensionResult(data)` - 연금 결과 메시지 전송

## 메시지 포맷

- 로또/연금 결과 메시지에 게임별 등수와 당첨금(가능한 경우)을 함께 표시합니다.
- `parse_mode=HTML`로 전송합니다.
