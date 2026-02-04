# 🎰 Lottochu

> AI 기반 로또 번호 추천 및 자동 알림 시스템

매주 **통계 분석**과 **AI**를 활용해 로또 번호를 추천하고, **Telegram**으로 알림을 보내는 NestJS 기반 백엔드 시스템입니다.

## ✨ 주요 기능

### 📊 통계 기반 추천 (3게임)
- 역대 당첨 번호 빈도 분석
- 하위 20개 번호 제외 후 랜덤 추출
- 1~45 중 출현 빈도 높은 번호 위주 추천

### 🤖 AI 기반 추천 (2게임)
- Ollama (llama3.2) 활용
- 최근 회차 패턴 분석
- 번호 범위별 분포 고려

### 📱 자동 Telegram 알림
- **월요일 12:30**: 이번 주 추천 번호 발송
- **토요일 22:00**: 당첨 결과 및 성적 분석 발송

### 🗄️ 데이터 관리
- 동행복권 API 연동 (전체 회차 데이터)
- PostgreSQL 기반 데이터 저장
- 2등/3등 당첨 정보까지 저장

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
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:latest
```

### 실행

```bash
# 개발 서버 실행
npx nx serve api

# 또는
npm run start:dev
```

## 📡 API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/` | 헬스 체크 |
| POST | `/lotto/sync` | 로또 데이터 동기화 |
| GET | `/lotto/draws` | 전체 회차 조회 |
| GET | `/lotto/draws/latest` | 최신 회차 조회 |
| GET | `/lotto/status` | 동기화 상태 확인 |
| POST | `/lotto/recommend` | 번호 추천 생성 |
| GET | `/statistics` | 전체 통계 조회 |
| GET | `/statistics/candidates` | 추천 후보 번호 |
| GET | `/statistics/most-frequent` | 최다 출현 번호 |
| GET | `/statistics/least-frequent` | 최소 출현 번호 |

## ⏰ 자동 스케줄

| Cron | 시간 | 작업 |
|------|------|------|
| `30 12 * * 1` | 월요일 12:30 | 번호 추천 → Telegram 발송 |
| `0 22 * * 6` | 토요일 22:00 | 결과 체크 → Telegram 발송 |
| `30 22 * * 6` | 토요일 22:30 | 통계 데이터 갱신 |

## 📊 데이터베이스 스키마

### draws (로또 추첨 결과)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | int (PK) | 회차 번호 |
| draw_date | date | 추첨일 |
| numbers | int[] | 당첨번호 6개 |
| bonus_number | int | 보너스 번호 |
| prize_1st ~ prize_3rd | bigint | 1~3등 당첨금 |
| winners_1st ~ winners_3rd | int | 1~3등 당첨자 수 |

### recommendations (추천 번호)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 고유 ID |
| target_draw_id | int | 대상 회차 |
| type | enum | STATISTICAL / AI |
| game_number | int | 게임 번호 (1~5) |
| numbers | int[] | 추천 번호 6개 |
| ai_reasoning | text | AI 추천 근거 |

### results (당첨 결과)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 고유 ID |
| recommendation_id | uuid (FK) | 추천 ID |
| matched_count | int | 일치 개수 |
| matched_numbers | int[] | 일치 번호 |
| has_bonus | boolean | 보너스 번호 일치 |
| prize_rank | int | 당첨 등수 (1~5, null=낙첨) |

## 📝 개발 일지

- [2026.02.03](docs/devlog_260203.md) - 프로젝트 초기 설정
- [2026.02.04](docs/devlog_260204.md) - API 연동, AI 통합, Telegram 알림

## 📜 라이선스

MIT License
