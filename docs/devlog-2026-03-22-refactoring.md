# Devlog: 코드 리뷰 & 리팩토링

**날짜:** 2026-03-22
**브랜치:** `refactor/code-review-improvements`

---

## 배경

전체 코드베이스를 리뷰한 결과 20개의 개선 포인트를 발견하고, 우선순위가 높은 항목들을 이번 리팩토링에서 처리했다.

---

## 변경 사항

### 1. Sync Handler Race Condition 해결 (Critical)

**문제:** `exists()` → `save()` 순차 호출 시 동시 실행 환경에서 중복 삽입 가능
**해결:** TypeORM `upsert` 배치 처리로 변경

**변경 파일:**
- `libs/lotto/src/lib/application/commands/sync-draws.handler.ts`
- `libs/lotto/src/lib/infrastructure/repositories/draw.repository.ts`
- `libs/pension/src/lib/application/commands/sync-pension-draws.handler.ts`
- `libs/pension/src/lib/infrastructure/repositories/pension-draw.repository.ts`

**Before:**
```typescript
for (const drawInfo of drawsFromApi) {
  const exists = await this.drawRepository.exists(drawInfo.drawId);
  if (exists) continue;
  await this.drawRepository.save(this.mapToDraw(drawInfo));
}
```

**After:**
```typescript
const draws = drawsFromApi.map((info) => this.mapToDraw(info));
const upserted = await this.drawRepository.upsertMany(draws);
```

---

### 2. Scheduler 에러 핸들링 강화 (Critical)

**문제:** 크론 작업 실패 시 로그만 남기고 알림 없음, 텔레그램 전송 실패 시 재시도 없음
**해결:**
- `withRetry()` 헬퍼 메서드 추가 (지수 백오프)
- 모든 크론 작업 catch 블록에 텔레그램 에러 알림 추가 (`notifyError()`)
- 텔레그램 전송을 `withRetry`로 감싸서 2회 재시도

**변경 파일:**
- `libs/scheduler/src/lib/scheduler.service.ts`

---

### 3. DhPensionClient API 재시도 로직 추가 (Critical)

**문제:** 연금복권 API 호출 실패 시 재시도 없이 해당 청크를 건너뜀
**해결:** `fetchWithRetry()` 메서드 추가 — 최대 3회, 지수 백오프 (300ms, 600ms, 1200ms)

**변경 파일:**
- `libs/shared/src/lib/clients/dh-pension.client.ts`

---

### 4. Statistics 캐싱 추가 (Minor → 성능 개선)

**문제:** `calculateStatistics()`, `getPensionDigitFrequency()` 호출 시마다 전체 테이블 스캔
**해결:** 5분 TTL 인메모리 캐시 적용

**변경 파일:**
- `libs/statistics/src/lib/statistics.service.ts`

---

### 5. Telegram HTML Escape 추가 (Minor → 보안)

**문제:** AI reasoning 텍스트에 `<`, `>`, `&` 포함 시 HTML 파싱 오류 가능
**해결:** `escapeHtml()` 헬퍼 추가, AI reasoning 출력 시 적용

**변경 파일:**
- `libs/telegram/src/lib/telegram.service.ts`

---

### 6. Telegram 메시지 전송 재시도 (Minor → 안정성)

**문제:** 텔레그램 API 일시 장애 시 메시지 유실
**해결:** `sendMessage()`에 최대 3회 재시도 + 지수 백오프 적용

**변경 파일:**
- `libs/telegram/src/lib/telegram.service.ts`

---

### 7. AI 추천 실패 격리 (Minor → 안정성)

**문제:** Ollama 서버 장애 시 전체 추천 생성이 실패할 수 있음
**해결:**
- `generateAINumbers()` 호출부를 try-catch로 감싸서 실패 시 랜덤 폴백
- Ollama 타임아웃 60초 → 30초로 축소

**변경 파일:**
- `libs/lotto/src/lib/application/commands/generate-recommendation.handler.ts`
- `libs/ai/src/lib/ollama.client.ts`

---

### 8. Scheduler 타입 캐스팅 정리 (Minor → 코드 품질)

**문제:** `handleWeeklyLottoResultCheck`, `handleWeeklyPensionResultCheck`에서 map 콜백에 불필요한 인라인 타입 선언
**해결:** 인라인 타입 제거, TypeScript 추론에 위임

**변경 파일:**
- `libs/scheduler/src/lib/scheduler.service.ts`

---

### 9. Database Config 하드코딩 제거 (Important)

**문제:** `database.config.ts`에서 패스워드 기본값이 `'postgres'`로 하드코딩
**해결:** production 환경에서 패스워드 미설정 시 에러 throw, 기본값 빈 문자열로 변경

**변경 파일:**
- `libs/shared/src/lib/config/database.config.ts`

---

## 미처리 항목 (향후 과제)

| # | 항목 | 우선순위 |
|---|------|----------|
| 1 | 로또/연금 모듈 공통 추상 클래스 추출 | Important |
| 2 | Controller → Application Service 비즈니스 로직 분리 | Important |
| 3 | Input Validation (class-validator + DTO) | Important |
| 4 | 연금복권 등수 계산 로직 검증 | Important |
| 5 | 커스텀 에러 클래스 계층 구조 | Minor |
| 6 | FK 인덱스 명시 추가 | Minor |
| 7 | 날짜 파싱 타임존 처리 | Minor |

---

## 빌드 검증

```
nx build api → webpack compiled successfully ✅
```
