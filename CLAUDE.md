# CLAUDE.md

## 🔒 운영자 가이드 작성 규칙 (운영자 명령 — 모든 가이드에 항상 적용)

운영자에게 무언가를 하도록 안내할 때는 반드시 아래 형식을 따른다:

1. **초등학생 수준으로** — 한 단계에 한 동작만. "~하고 ~한 뒤 ~하세요" 금지, 전부 쪼갤 것
2. **모든 단계에 클릭할 링크를 직접 제공** — 메뉴를 찾아가게 하지 말고 바로 가는 주소를 줄 것
3. **입력할 값은 전부 복사-붙여넣기용 코드블록으로** — 운영자가 타이핑할 일이 없게
4. **붙여넣는 위치를 명확히 구분** — "브라우저 주소창"인지 "화면 안의 입력칸"인지 반드시 명시
   (과거 사고: 화면 안 검색창에 넣을 주소를 브라우저 주소창에 붙여넣음)
5. **각 단계의 성공 확인 방법 제공** — "이 화면이 보이면 성공" 식으로
6. **민감정보(시크릿/토큰)는 텍스트로 받기** — 스크린샷은 I/l/1, O/0 판독 불가로 오류 유발
   (과거 사고: 스크린샷 OCR로 시크릿을 옮겨적다 2회 실패)
7. 명령어(cmd 등)는 코드블록 복사 버튼 사용을 안내하고, 붙여넣기 전 메모장에서 온전한지 확인시킬 것
8. **변수/시크릿 등록 안내 시 NAME 과 VALUE 를 각각 별도의 복사용 코드블록으로 제공** — 표·인라인 코드 금지
   (예: "Name:" 아래 코드블록, "Value:" 아래 코드블록. 항목이 여러 개면 항목마다 반복)

→ 상세 형식·템플릿: `.claude/skills/guide/SKILL.md` (/guide 스킬 — 모든 가이드에 항상 적용)

## 프로젝트 요약

- **목적**: 생활정보/꿀팁 SEO 수익화 — 자동 발행 파이프라인 (docs/ARCHITECTURE.md 참고)
- **채널 연결 순서(운영자 지정)**: ①네이버 블로그 ②구글 블로거 ③워드프레스 ④광고사이트
- **수익화**: 애드센스(커스텀 도메인 필수) · 네이버 쇼핑커넥트 · 쿠팡 파트너스(AF0950107)
- **운영 방식**: 한 번에 가이드 하나씩 순차 진행, 완료 확인 후 다음 단계로
- **셋업 절차**: docs/SETUP.md · 운영자가 할 일은 GitHub Secrets/Variables 등록(본인 직접)
- **멀티 사이트**: SITE_PROFILE 프로필로 도메인별 사이트 운영 — docs/MULTISITE.md
  (default=starship-ent.ai.kr 생활꿀팁 · kkultip=todayskkultip.co.kr 머니꿀팁 · jype=jype.ai.kr 영어 K-culture)

## 진행 현황 (2026-07-17 기준)

- ✅ 1번 네이버 블로그: 개설(blog.naver.com/astrape1) + 쇼핑커넥트 가입 (발행은 수동, 아직 0편)
- ✅ 2번 구글 블로거: 연동 완료, 자동 발행 중 (todays-kkultip.blogspot.com)
- ⏸ 3번 워드프레스: **보류** — WordPress.com 무료 블로그가 자동 발행을 스팸 분류, 계정 정지(2026-07-17).
  무료 플랜은 자동화 부적합. 재개 조건: 자체 호스팅 WP + config 의 wordpress.enabled 복원
- ✅ 4번 광고사이트: 쇼핑커넥트 ✅ · 쿠팡파트너스 ✅(제습기 글 링크 게시+스크린샷 제출)
  · 애드센스 ✅ 심사 접수 완료(2~4주 대기) — 커스텀 도메인 starship-ent.ai.kr 연결됨
- ▶ 자동 발행 크론 가동 (매일 09/15/21시 KST) · 주제 풀 자동 보충(topic-generate.mjs)
- ✅ 파이프라인 e2e 최종 검증(2026-07-17): 생성→블로거 발행→봇 커밋→배포 전 단계 성공 확인
- ▶ 멀티 사이트 확장(2026-07-17): kkultip/jype 프로필 구현 완료 — 신규 레포 2개 생성·변수·Pages·DNS·
  애드센스 사이트 추가는 운영자 가이드로 순차 진행 중
- 남은 일: 신규 도메인 2개 셋업(레포 복제→변수→Pages→DNS→검색등록→애드센스 사이트 추가) ·
  코드 동기화 활성화(SYNC_TOKEN PAT + SYNC_TARGETS — docs/MULTISITE.md) ·
  네이버 블로그 발행 루틴 시작 · 애드센스 승인 후 슬롯 ID 등록
- 진행 위치(2026-07-18): 3개 사이트 체제 가동 완료 ✅
  · 위성 2개(todayskkultip 머니꿀팁 / jype Korea Unboxed): 레포·변수·Pages·커스텀 도메인·DNS·
    코드+콘텐츠 자동 동기화(SYNC_TOKEN)·크론 3회/일 모두 가동
  · 검색등록 완료: 구글(3도메인, 사이트맵) · Bing(3도메인) · 네이버(starship+todayskkultip, 사이트맵+RSS)
  · 애드센스 3개 도메인 심사 중 · 엔터 도메인 전략(JYP/스타쉽 타깃 콘텐츠+비제휴 고지) 적용
  · 사고 이력: 크롬 자동번역이 GitHub 변수값을 한글로 오염(SITE_PROFILE=쿨팁) → 가이드에 번역 끄기 안내 필수
  · 수정: publish.yml 에 NAVER_VERIFICATION_FILE 등 env 6종 누락 보완(242105e)
- 진행(2026-07-19): ③워드프레스 재개 완료 ✅ — 카페24 자체 호스팅(ljhnimwithit.mycafe24.com) 연결,
  테스트 발행 성공 확인(run #119). default 글 33편 전량 백필 대기 전환(회당 2편 자동 드립).
  publish.yml 커밋 스텝 조건 제거(발행 플래그 유실→중복 발행 버그 예방) ·
  대시보드 overview 핵심 요약형 개편(KPI+사이트3+채널+다음발행3+할일 / 상세는 리포트 탭)
- 진행(2026-07-19 저녁): 네이버 복붙 발행 시스템 구축 ✅ — 대시보드 네이버 탭에서 글별
  [제목]/[📋 원고] 원클릭 복사(서식 유지) → 붙여넣기 → 글감→쇼핑 상품 카드 3개 삽입 → 발행.
  쇼핑커넥트 수익형(카테고리별 추천 상품 슬롯+고지문 자동). 정책: "최저가" 단정 금지(확인 유도형만),
  상품 이미지는 상세페이지 복사 금지 → 글감 카드로만(저작권) · automation/naver-drafts.mjs
- 진행(2026-07-19 밤): 쿠팡 파트너스 전 글 자동 삽입 ✅ — 모든 사이트 글(+블로거·WP) 하단에
  카테고리별 쿠팡 상품 블록 자동 삽입(automation/coupang.mjs). 애드센스와 같은 페이지 공존 = 2중 수익.
  카테고리별 추적 링크는 config/coupang-links.json(운영자가 파트너스 링크 한 번 붙여넣기 → 해당 카테고리
  전 글 자동 적용, 미등록 시 쿠팡 검색으로 대체). "최저가"는 강조하되 단정 회피(확인 유도형 CTA).
  대시보드 광고탭에 링크 등록 상태·편집 링크 추가. 영문(jype) 프로필은 제외.
- 진행(2026-07-24): 프로필 이모티콘 아바타 + 연예 채널 정책 + 추천피드 패턴 반영 ✅ (배포 run #160)
  · 프로필 위젯 아바타를 힉스필드 생성 이모티콘 이미지로 교체(default 전구/kkultip 코인/jype 박스) —
    src/assets/avatar.png + brand/<프로필>/avatar.png · build.mjs sidebar 의 site.brandmark 객체
    문자열화 "[object Object]" 버그 수정(이미지 있으면 <img>, 없으면 brandmark.emoji 폴백) · main.css img.pf-avatar
  · 연예(ent/entertainment) 콘텐츠는 네이버·구글 블로그에 발행하지 않음 — lib.mjs isEntertainment(),
    generate.mjs channels.blogger=false, naver-drafts.mjs 제외 · 기존 연예 7편 channels.blogger=false 정리
    (이미 블로거에 발행된 7편은 운영자 지시로 **삭제하지 않고 그대로 유지** — 신규분만 제외)
  · 연예 콘텐츠는 starship-ent(default)·jype 2개 사이트에서만(kkultip 카테고리에 ent 없음) — 확인
  · 네이버 '추천 콘텐츠' 인기 블로그 공통 패턴을 생성 프롬프트(ko/en)에 반영(호기심·이득 훅 제목/공감
    도입+결론 선제시/경험담 톤/실용가치/시의성 앵글) — automation/generate.mjs feedPatterns()
- 진행(2026-07-24): 채널별 콘텐츠 변형(중복 콘텐츠 방지) ✅ — 오늘부터 같은 글이라도 채널마다
  도입부·요약 스타일·마무리 CTA·FAQ 순서를 다르게 발행(automation/variation.mjs, 무료 결정적 변형).
  사이트=원본(canonical) 유지, 워드프레스·블로거·네이버는 각기 다른 도입/요약/마무리로 발행 →
  어떤 두 채널도 동일 본문으로 나가지 않음. (본문 핵심은 공유하되 canonical+syndication 푸터로 원본 보호)
- 대시보드(발행 현황·SEO/GEO 진척도·채널): default https://starship-ent.ai.kr/dashboard/ ·
  kkultip https://todayskkultip.co.kr/dashboard/ · jype https://jype.ai.kr/dashboard/
- 남은 일: 쿠팡 파트너스 카테고리별 추적 링크 6개 등록(coupang-links.json) ·
  애드센스 승인 후 슬롯 ID 4종 등록 · 네이버 블로그 복붙 발행 루틴 시작 ·
  WP 애드센스 코드 테마 부착(승인 후) · (선택) jype 네이버 등록 · www CNAME 레코드 ·
  수익 발생 시 revenue.json 기록
