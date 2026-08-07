# 🎰 Lottochu

> AI 기반 로또·연금복권 번호 추천 및 자동 알림 시스템

매주 **통계 분석**과 **AI**를 활용해 **로또**와 **연금복권** 번호를 추천하고, **Telegram**으로 알림을 보내는 NestJS 기반 백엔드 시스템입니다.

## ✨ 주요 기능

### 📊 통계 기반 추천 (3게임)
- 역대 당첨 번호 빈도 분석
- 하위 20개 번호 제외 후 랜덤 추출
- 1~45 중 출현 빈도 높은 번호 위주 추천

### 🤖 AI 기반 추천 (로또 2게임)
- Ollama (llama3.2) 활용
- 최근 회차 패턴 분석
- 번호 범위별 분포 고려

### 🎱 연금 추천
- 통계 기반 5게임 생성 (조 1~5 고정)
- 연금 자리수 빈도 기반 추천 번호 생성

### 📱 자동 Telegram 알림
- **로또**: 월요일 12:30 추천 발송, 토요일 22:00 당첨 결과 발송
- **연금복권**: 금요일 12:00 당첨 결과, 12:30 다음 회차 추천 발송

### 🗄️ 데이터 관리
- 동행복권 API 연동 (로또·연금 당첨 데이터)
- PostgreSQL 기반 데이터 저장
- 로또 2등/3등, 연금 1~8등 당첨 정보 저장

## 🏗️ 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | NestJS + Nx (Monorepo) |
| Architecture | CQRS |
| Database | PostgreSQL + TypeORM |
| AI | Ollama (llama3.2) |
| Notification | Telegram Bot API (Telegraf) |
| Scheduler | @nestjs/schedule (Cron) |

## 📁 프로젝트 구조

```
lottochu/
├── apps/
│   └── api/                    # NestJS 메인 애플리케이션
├── libs/
│   ├── shared/                 # 공통 모듈 (DhLotteryClient)
│   ├── lotto/                  # 로또 도메인 (Entity, Repository, CQRS)
│   ├── statistics/             # 통계 분석 서비스
│   ├── ai/                     # Ollama AI 연동
│   ├── telegram/               # Telegram 봇 서비스
│   └── scheduler/              # 자동 실행 스케줄러
└── docs/
    └── devlog_*.md             # 개발 일지
```

## 🚀 시작하기

### 사전 요구사항

- Node.js 18+
- PostgreSQL 14+
- Ollama (llama3.2 모델)

### 설치

```bash
# 의존성 설치
npm install

# Ollama 모델 설치
ollama pull llama3.2
```

### 환경변수 설정

`.env` 파일을 생성하고 아래 내용을 설정하세요:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=lottochu
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:latest
```

### 실행

```bash
# 개발 서버 실행
npm run start
# 또는
npx nx serve api
# watch 모드 (파일 변경 시 재시작)
npm run start:dev
```

### DB 연결이 안 될 때

`connection timeout expired` (localhost:5432)가 나오면 PostgreSQL 서버가 꺼져 있는 상태입니다.  
→ [PostgreSQL 서버 수동 시작 방법](docs/start-postgresql.md) 참고.

## 📡 API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/` | 헬스 체크 |

**로또**
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/lotto/sync` | 당첨 데이터 동기화 (`?start=&end=`) |
| GET | `/lotto/draws` | 전체 회차 조회 |
| GET | `/lotto/draws/latest` | 최신 회차 조회 |
| GET | `/lotto/status` | 동기화 상태 확인 |
| POST | `/lotto/recommend` | 번호 추천 생성 (`?draw=`) |
| POST | `/lotto/recommend/send` | 추천 생성 후 Telegram 발송 (수동) |
| POST | `/lotto/result/check-and-send` | 최신 회차 결과 확인 후 Telegram 발송 (수동) |

**연금복권**
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/pension/sync` | 당첨 데이터 동기화 (`?start=&end=`) |
| GET | `/pension/draws` | 전체 회차 조회 |
| GET | `/pension/draws/latest` | 최신 회차 조회 |
| GET | `/pension/status` | 동기화 상태 확인 |
| POST | `/pension/recommend` | 번호 추천 생성 (`?draw=`) |
| POST | `/pension/recommend/send` | 추천 생성 후 Telegram 발송 (수동) |
| POST | `/pension/result/check-and-send` | 최신 회차 결과 확인 후 Telegram 발송 (수동) |

**통계**
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/statistics` | 전체 통계 조회 |
| GET | `/statistics/candidates` | 추천 후보 번호 |
| GET | `/statistics/most-frequent` | 최다 출현 번호 |
| GET | `/statistics/least-frequent` | 최소 출현 번호 |

## ⏰ 자동 스케줄 (Asia/Seoul)

| Cron | 요일·시간 | 작업 |
|------|-----------|------|
| `30 12 * * 1` | 월 12:30 | 로또 추천 → Telegram 발송 |
| `0 22 * * 6` | 토 22:00 | 로또 결과 체크 → Telegram 발송 |
| `30 22 * * 6` | 토 22:30 | 로또 당첨 데이터 동기화(통계용) |
| `0 12 * * 5` | 금 12:00 | 연금 결과 체크 → Telegram 발송 |
| `30 12 * * 5` | 금 12:30 | 연금 추천 → Telegram 발송 |
| `0 13 * * 5` | 금 13:00 | 연금 당첨 데이터 동기화(통계용) |

## 📊 데이터베이스 스키마

### 로또 (lotto_draws, lotto_recommendations, lotto_results)

**lotto_draws** (로또 추첨 결과)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | int (PK) | 회차 번호 |
| draw_date | date | 추첨일 |
| numbers | int[] | 당첨번호 6개 |
| bonus_number | int | 보너스 번호 |
| prize_1st ~ prize_3rd | bigint | 1~3등 당첨금 |
| winners_1st ~ winners_3rd | int | 1~3등 당첨자 수 |

**lotto_recommendations** (로또 추천 번호)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 고유 ID |
| target_draw_id | int | 대상 회차 |
| type | enum | STATISTICAL / AI |
| game_number | int | 게임 번호 (1~5) |
| numbers | int[] | 추천 번호 6개 |
| ai_reasoning | text | AI 추천 근거 |

**lotto_results** (로또 당첨 결과)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 고유 ID |
| recommendation_id | uuid (FK) | 추천 ID |
| matched_count | int | 일치 개수 |
| matched_numbers | int[] | 일치 번호 |
| has_bonus | boolean | 보너스 번호 일치 |
| prize_rank | int | 당첨 등수 (1~5, null=낙첨) |

### 연금복권 (pension_draws, pension_recommendations, pension_results)

**pension_draws**: 회차(id), 추첨일, 조/6자리(당첨번호 nullable), 1~8등 당첨금·당첨자 수  
**pension_recommendations**: target_draw_id, type, game_number, group_no, digits(6자리), ai_reasoning  
**pension_results**: recommendation_id, prize_rank(1~8 또는 null)

- 로또 테이블명 변경 마이그레이션: `docs/migrations/rename-lotto-tables.sql` (기존 DB 사용 시 실행 필요)

## 📝 개발 일지

- [2026.02.03](docs/devlog_260203.md) - 프로젝트 초기 설정
- [2026.02.04](docs/devlog_260204.md) - API 연동, AI 통합, Telegram 알림
- [2026.02.05](docs/devlog_260205.md) - 연금복권 추가, 로또 테이블명 변경
- [2026.02.08](docs/devlog_260208.md) - 연금 스케줄 금요일 통일, 추천 저장 로직, Ollama 모델명, 스케줄러 스킵 조건
- [2026.02.17](docs/devlog_260217.md) - PostgreSQL 수동 시작(pg_ctl), 수동 트리거(결과/추천 발송)
- [2026.08.08](docs/devlog_260808.md) - 전체 회차 최신화, 운영 검토, 등수 계산·재처리 안정성 개선

## 📜 라이선스

MIT License
