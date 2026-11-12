# 1팀 | 최애의 포토

[(1팀 듀얼 마스터즈)](https://app.notion.com/p/be088094387582c8b9de81af571d3cc4?v=96b880943875835d98fa882683b530e2&source=copy_link)

## 팀원 구성

| 팀원 | 개인 GitHub |
| --- | --- |
| 곽소철 | [thcjfd](https://github.com/thcjfd) |
| 황규리 | (개인 Github 링크) |
| 권다운 | (개인 Github 링크) |
| 윤욱진 | https://github.com/Guts91-creator |
| 민승재 |[ (개인 Github 링크)](https://github.com/tmdwosktn-png) |

---

## 프로젝트 소개

- 최애의 포토는 직접 만든 포토카드를 등록하고, 포인트로 구매하거나 다른 사용자와 교환할 수 있는 서비스입니다.
- 프로젝트 기간: 2026.10.23 ~ 2026.11.12

---

## 기술 스택

- Frontend: JavaScript, Next.js, React, vanilla-extract, Storybook
- Backend: Express.js, Prisma ORM
- Database: PostgreSQL
- 공통 Tool: Git & GitHub
- 패키지 매니저: pnpm

---

## 팀원별 구현 기능 상세

### 곽소철

(자신이 개발한 기능에 대한 사진이나 gif 파일 첨부)

- **인증 및 내 정보** — 로그인·회원가입·로그아웃, 소셜 로그인 연동, 가입 축하 모달, 내 정보 페이지
- **랜딩 및 공용 UI** — 랜딩 페이지, 반응형 헤더, 버튼·모달·입력 필드, Storybook 설정

### 황규리

(자신이 개발한 기능에 대한 사진이나 gif 파일 첨부)

- **마이 갤러리** — 포토카드 생성, 남은 생성 횟수 표시, 카드 상세 모달 및 판매 화면 연결
- **나의 거래 포토카드** — 교환 완료 상태 표시, 거래 카드에서 판매글 상세로 이동

### 권다운

(자신이 개발한 기능에 대한 사진이나 gif 파일 첨부)

- **마켓플레이스** — 카드 목록 및 그룹별 필터, 모바일 필터 바텀시트, 반응형 카드 그리드
- **알림** — 데스크톱 알림 드롭다운과 모바일 알림 화면을 헤더에 연결

### 윤욱진

(자신이 개발한 기능에 대한 사진이나 gif 파일 첨부)

- **교환 제안** — 마켓플레이스 상세에 교환 제안 기능 연동, 제안 등록 후 구매 상태 유지
- **랜덤 포인트** — 포인트 뽑기 모달 UI 개선

### 민승재

(자신이 개발한 기능에 대한 사진이나 gif 파일 첨부)

- **판매 관리 API** — 판매 등록·상세 조회·수정·취소 기능 구현
- **구매 API** — 포토카드 구매, 포인트 차감·적립, 카드 소유권 이전 및 거래 기록 처리
- **재고 관리** — 판매 수량 관리, 구매 시 재고 차감 및 품절 처리
- **중복 구매 방지** — 동일한 구매 요청이 중복 처리되지 않도록 검증
- **알림 기능 개선** — 구매·판매·품절·교환 거절 알림에 실제 포토카드 이름 표시
- 

---

## 파일 구조

### Frontend

```text
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   ├── (main)/
│   │   ├── marketplace/
│   │   ├── my-gallery/
│   │   ├── my-info/
│   │   ├── my-sales/
│   │   └── sell/
│   ├── favicon.ico
│   └── layout.js
├── assets/
├── components/
├── contexts/
├── hooks/
├── lib/
└── styles/
```


### Backend

```text
src/
├── constants/
├── controllers/
├── middlewares/
├── prisma/
├── repositories/
├── routes/
├── schemas/
├── services/
├── swagger/
├── utils/
├── app.js
├── container.js
└── server.js
```

- [Frontend 저장소](https://github.com/Codeit-FS-midproject-team1/fav-photo-fe)
- [Backend 저장소](https://github.com/Codeit-FS-midproject-team1/fav-photo-be)

---

## 구현 홈페이지

[(최애의 포토)](https://midproject-fe.vercel.app/)



---

## 프로젝트 회고록

(제작한 발표자료 링크 혹은 첨부파일 첨부)
