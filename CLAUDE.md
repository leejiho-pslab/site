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
- 스코프 확정(2026-07-30): 이 브랜치 = **5개 destination 통합 자동화 프로젝트**.
  ① starship-ent.ai.kr(default 빌드+대시보드) ② todays-kkultip.blogspot.com(Blogger 채널)
  ③ ljhnimwithit.mycafe24.com(WordPress 채널) — 이상 3곳은 이 레포가 직접 구동.
  ④ todayskkultip.co.kr(kkultip) ⑤ jype.ai.kr(jype) — 별도 레포이며 이 레포가 sync-sites 로
  코드·콘텐츠를 공급. → 5개 모두 이 브랜치에서 통합 운영하는 게 확정 스코프.
  · 경위: 잠시 sync 제거(독립화)했다가, 위 통합 스코프 확인 후 **sync 복원**
    (sync-sites.yml + automation/sync-sites.sh 되살림). SYNC_TARGETS 변수·SYNC_TOKEN 시크릿 유지 필요.
- 진행(2026-07-30): 채널별 "완전 고유" 콘텐츠 체제 ✅ — 기존 결정적 변형(도입/마무리만 상이)으로는
  중복 문서 위험 → automation/rewrite.mjs 신설: 채널(blogger/wordpress/naver)마다 제목·소제목 구성·
  모든 문장·FAQ를 LLM(haiku)으로 전면 재작성, 채널별 타깃 롱테일 키워드도 다르게(서로 검색 경쟁 방지).
  사이트=원본(canonical) 유지·슬러그 보존. 캐시 content/variants/<slug>.<channel>.json (CI 커밋, 1회 생성).
  run-all 1.7단계 사전 생성(발행 임박분+네이버 최신 3편/런) · 실패 시 기존 결정적 변형 폴백.
  네이버 대시보드 원고·제목도 재작성본 기준. REWRITE_MODEL/REWRITE_NAVER_LIMIT 로 조정 가능.
- 진행(2026-08-03): API 비용 절감 체제 ✅ — 수익 0 구간 동안 ①본문 생성 기본모델 sonnet→haiku
  (CONTENT_MODEL 변수로 복귀 가능) ②새 글 생성 하루 1회(09시 크론)만, 15/21시는 발행·빌드만
  (publish.yml GENERATE 게이트) ③재작성 네이버 백필 3→2/런 ④완전 0원 스위치: Variables 에
  GENERATE=false(생성 중단)·REWRITE=false(재작성 중단, 결정적 변형 폴백) — 발행·빌드·이미지는 무료로 계속.
  → 2026-08-13 운영자 결정: 심사 중 활동성 확보 위해 GENERATE 변수 삭제(생성 재개, 하루 1회 haiku).
    REWRITE=false 는 유지(재작성 0원). 승인 후 재검토.
  예상: 월 ~5만원 → ~5천원 수준. 수익 발생 시 원복 권장.
- 진행(2026-08-05): 네이버 추가 포스팅 10건 구성 ✅ — naver-batch.yml(수동 디스패치) 신설:
  generate 입력으로 신규 글 생성→네이버 고유 원고 재작성→이미지 렌더→커밋까지 일괄.
  · 운영자가 기존 원고를 "모두 업로드"한 상태였으므로 **완전 신규 글 10편**(요청 큐 4건 포함,
    시즌·구매전환형: 제철음식/가습기/개학준비물/추석선물세트/차량침수예방/간절기침구 등)을 생성해
    네이버 원고+이미지3장+글맞춤 상품을 부여 — 새 슬러그라 대시보드 할 일에 자동 노출.
  · 교훈: ①대시보드 할 일은 localStorage 발행완료 체크 기반 — 이미 발행된 슬러그에 원고를 만들면 안 뜸
    ②봇(GITHUB_TOKEN) 푸시는 publish.yml 을 트리거하지 않음 — 배치 후 별도 푸시/디스패치로 빌드 필요
    ③rewrite.mjs 네이버 선정은 "최신 N편"이라 기존 원고 보유 글이 끼면 신규 생성 수가 줄어듦
    ④topic 풀에서 ent 주제가 뽑히면 네이버 제외로 수가 모자람 → requests.json pending 으로 보충
  · 워크플로 안정화: requests.json 커밋 포함(pending→done 유실 방지)+pull --rebase --autostash
  · 힉스필드 실사 히어로 10장(잔여 크레딧 ~7.65) — 신규 10편은 렌더 카드 3장 구성(실사는 크레딧 충전 후)
- 사고·복구(2026-08-08): 블로거 중복 발행 사고 ✅ 복구 — publish.yml 커밋 스텝의 git add 가
  gitignore 된 config/coupang-links-cache.json(CI 체크아웃에 없음) 때문에 fatal → **전체 스테이징 실패**,
  8/3 이후 published 플래그 미커밋 → 같은 글이 매 크론마다 재발행(면역음식 13개·침구 9개 등 중복 23개).
  · 조치: ①캐시 파일 gitignore 해제+추적 ②git add 경로별 개별 실행(+autostash) ③blogger-dedupe.mjs/.yml
    신설(원문 링크 슬러그 기준 최초본만 유지·삭제, 플래그 복구) — 중복 23개 삭제, 블로거 83개 정상화
  · 부수 발견: naver-batch 생성 스텝에 WORDPRESS_URL/APP_PASSWORD env 누락 → 8/5 배치 글 14편이
    wordpress:false 로 구워짐 → 채널 복구+env 추가(WP 백필 2편/런 자동 소화)
  · 교훈: 커밋 스텝 git add 는 한 경로만 없어도 통째로 실패한다 — 반드시 경로별 개별 add.
    또한 봇 커밋 성공 여부는 "chore: 자동 발행 글 추가" 커밋이 주기적으로 찍히는지로 감시 가능.
- 대시보드(발행 현황·SEO/GEO 진척도·채널): default https://starship-ent.ai.kr/dashboard/ ·
  kkultip https://todayskkultip.co.kr/dashboard/ · jype https://jype.ai.kr/dashboard/
- 진행(2026-08-13): 애드센스 4개 도메인 전부 심사 대기 상태 ✅ — 위성 30편 도달 후 운영자가
  todayskkultip 검토 요청 완료(8/13). starship(7/26 재요청)·jype·cafe24 는 "준비 중" 심사 진행.
  ads.txt "찾을 수 없음" 표시는 스테일(두 도메인 라이브 정상 확인, jype 는 승인됨) — 조치 불필요.
  starship 8/16까지 무소식 시 커뮤니티 문의 가이드 예정. 8/11 발견·수리: 봇 푸시가 sync-sites 를
  못 깨워 위성 글 4편/프로필 미전달 → 수동 sync + 부스트/배치에 디스패치 스텝 추가.
- 진행(2026-08-19): jype 애드센스 반려(8/14, 가치 낮은 콘텐츠) — 원인 분석: 부스트가 목표 30 도달 후
  정지해 심사 시점에 11일간 업데이트 정체. 대응: content-boost 를 목표 45편·하루 2편 지속 성장 모드로
  전환(kkultip 심사 중 신선도 확보 겸). jype 재신청은 2주 간격 규칙상 8/28 이후(그때 ~45편).
  · 긍정 신호: todayskkultip 구글 검색 28일간 클릭 30회 달성(8/16, 첫 유입 성과)
  · starship 재검토 24일째 무소식 → 커뮤니티 문의 단계
- 남은 일: 쿠팡 파트너스 카테고리별 추적 링크 6개 등록(coupang-links.json) ·
  애드센스 승인 후 슬롯 ID 4종 등록 · 네이버 블로그 복붙 발행 루틴 시작 ·
  WP 애드센스 코드 테마 부착(승인 후) · (선택) jype 네이버 등록 · www CNAME 레코드 ·
  수익 발생 시 revenue.json 기록
