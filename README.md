# Spenduel ⚔️

친구와 소비 절제를 1:1로 대결하는 React Native(Expo) 앱

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 `.env`로 복사하고 값을 채워주세요:

```bash
cp .env.example .env
```

| 변수 | 설명 |
|------|------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
| `EXPO_PUBLIC_KAKAO_APP_KEY` | 카카오 앱 키 |
| `EXPO_PUBLIC_CLAUDE_API_KEY` | Anthropic Claude API 키 |

### 3. Supabase 설정

Supabase Dashboard에서:

1. **SQL Editor**에서 `supabase/schema.sql` 실행
2. **SQL Editor**에서 `supabase/clean_day_function.sql` 실행
3. **Storage** > `evidences` 버킷 생성 (Public)
4. **Realtime** > `score_events`, `disputes`, `duels` 테이블 활성화

### 4. 카카오 로그인 설정

1. [카카오 개발자](https://developers.kakao.com)에서 앱 생성
2. 플랫폼에 iOS/Android 번들ID 등록: `com.spenduel.app`
3. `app.json`의 `${KAKAO_APP_KEY}` 부분에 실제 키 입력

### 5. 앱 실행

```bash
# Expo Go (개발)
npx expo start

# iOS 시뮬레이터
npx expo start --ios

# Android 에뮬레이터
npx expo start --android
```

> **참고**: 카카오 로그인은 실제 디바이스 또는 개발 빌드(`expo-dev-client`)에서만 동작합니다.

---

## 폴더 구조

```
spenduel/
├── app/
│   ├── _layout.tsx          # 루트 레이아웃 (인증 라우팅)
│   ├── (auth)/
│   │   └── index.tsx        # 로그인 화면
│   ├── (tabs)/
│   │   ├── index.tsx        # 홈 화면 (대결 목록)
│   │   └── profile.tsx      # 프로필 화면
│   └── duel/
│       ├── create.tsx       # 대결 생성 (4단계)
│       └── [id].tsx         # 대결 상세 (실시간)
├── components/
│   ├── DuelCard.tsx         # 대결 카드
│   ├── ScoreBoard.tsx       # 실시간 점수판
│   ├── ActivityFeed.tsx     # 활동 피드
│   └── SpendingModal.tsx    # 소비 기록 모달
├── hooks/
│   ├── useAuth.ts           # 인증 상태
│   ├── useDuel.ts           # 대결 데이터
│   └── useRealtime.ts       # Supabase Realtime 구독
├── lib/
│   ├── supabase.ts          # Supabase 클라이언트
│   ├── api.ts               # API 헬퍼 함수
│   ├── claude.ts            # Claude AI 분류
│   └── notifications.ts     # Expo 푸시 알림
├── types/
│   └── index.ts             # TypeScript 타입 정의
└── supabase/
    ├── schema.sql           # DB 스키마
    └── clean_day_function.sql  # 자정 집계 함수
```

## 점수 규칙

| 이벤트 | 점수 |
|--------|------|
| 클린 데이 (해당 카테고리 소비 0) | +10 |
| 유혹 참기 (하루 최대 2회) | +3 |
| 3일 연속 클린 | +10 보너스 |
| 7일 연속 클린 | +20 보너스 |
| 소비 1만원 미만 | -5 |
| 소비 1~3만원 | -10 |
| 소비 3만원 이상 | -20 |
| 신고 인정 (피신고자) | -15 |
| 신고 인정 (신고자) | +5 |

## 공정성 레이어

- **카드 연동 유저**: 소비 기록 시 영수증 선택 사항
- **카드 미연동 유저**: 소비 기록 시 영수증 사진 **필수**
- **이의제기**: 24시간 내 상대방에게 알림, 인정 시 점수 즉시 반영
- **신뢰도 점수**: 허위 신고 패턴 감지 (추후 확장)
