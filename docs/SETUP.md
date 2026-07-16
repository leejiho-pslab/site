# 셋업 & 운영 가이드 (사용자용)

이 문서는 **사용자가 직접 해야 하는 작업**을 순서대로 정리한 가이드입니다.
코드/자동화는 이미 구축되어 있으니, 아래 단계만 따라 하면 사이트가 100% 자동으로
발행·배포됩니다. (소요 시간: 필수 단계만 약 15~20분)

> 용어: **Secret**(민감값, 노출 금지) / **Variable**(공개돼도 되는 값).
> 둘 다 GitHub 저장소 **Settings → Secrets and variables → Actions** 에서 등록합니다.

---

## ✅ 한눈에 보는 체크리스트

| 단계 | 작업 | 필수? | 소요 |
| --- | --- | --- | --- |
| 1 | GitHub Pages 활성화 | **필수** | 1분 |
| 2 | 사이트 주소 변수 설정 | **필수** | 2분 |
| 3 | Claude API 키 등록(자동 글 생성) | **필수** | 3분 |
| 4 | 첫 발행(수동 실행)으로 동작 확인 | **필수** | 2분 |
| 5 | 네이버 블로그 연결 (1순위) | 권장 | 5분 |
| 6 | 구글 블로거 연동 (2순위) | 선택 | 15분 |
| 7 | 워드프레스 연동 (3순위) | 선택 | 10분 |
| 8 | 광고사이트 연결 — 애드센스·쿠팡파트너스·네이버쇼핑파트너 (4순위) | 권장 | 승인 별도 |
| 9 | Google/Bing 검색엔진 등록 | 권장 | 10분 |
| 10 | 커스텀 도메인 연결 | 선택 | 10분+DNS |

> 채널 연결은 **네이버 블로그 → 구글 블로거 → 워드프레스 → 광고사이트** 순으로 진행하는 것을 권장합니다.
> 네이버는 공식 API가 없어 "연동"이 아니라 자동 생성된 원고를 다운로드해 직접 붙여넣는 방식이지만,
> 별도 설정 없이 바로 시작할 수 있어 가장 먼저 착수하기 좋습니다.

---

## STEP 1. GitHub Pages 활성화 (필수)

1. 저장소 → **Settings → Pages**
2. **Build and deployment → Source** 를 **`GitHub Actions`** 로 선택
3. 끝. (별도 브랜치 지정 불필요 — 워크플로우가 배포를 담당)

> 현재 기본 브랜치가 `claude/seo-monetization-site-0g52e1` 이라 **매일 자동 발행 크론**도
> 이 브랜치 기준으로 동작합니다. 별도 PR/머지 없이 바로 운영됩니다.

---

## STEP 2. 사이트 주소 변수 설정 (필수)

**Settings → Secrets and variables → Actions → Variables 탭 → New repository variable**

| 변수 이름 | 값(예시) | 설명 |
| --- | --- | --- |
| `SITE_URL` | `https://leejiho-pslab.github.io/site` | 배포 주소(끝 슬래시 없이) |
| `SITE_BASE_PATH` | `/site` | 프로젝트 페이지 하위 경로. **커스텀 도메인 쓰면 빈 값** |

> 사용자명/저장소명이 다르면 `SITE_URL` 을 그에 맞게 바꾸세요.
> 예) 저장소가 `myblog` 면 `https://leejiho-pslab.github.io/myblog`, `SITE_BASE_PATH=/myblog`

---

## STEP 3. Claude API 키 등록 — 자동 글 생성 (필수)

100% 자동 발행의 핵심입니다. 키가 없으면 글이 생성되지 않고 빌드/배포만 됩니다.

1. [Anthropic Console](https://console.anthropic.com) → API Keys → **Create Key**
2. 결제 수단 등록(소액 사용량 과금) 후 키 복사
3. GitHub **Secrets 탭 → New repository secret**

| Secret 이름 | 값 |
| --- | --- |
| `ANTHROPIC_API_KEY` | `sk-ant-...` (복사한 키) |

4. (선택) **Variables 탭**에 모델/발행량 지정

| 변수 | 값(예시) | 설명 |
| --- | --- | --- |
| `CONTENT_MODEL` | `claude-sonnet-4-6` | 글 생성 모델(비용↓). 품질 우선이면 `claude-opus-4-8` |
| `POSTS_PER_RUN` | `1` | 1회 실행당 글 수(초기엔 1 권장) |

---

## STEP 4. 첫 발행으로 동작 확인 (필수)

1. 저장소 → **Actions** 탭 → 왼쪽 **자동 발행** 워크플로우 선택
2. 오른쪽 **Run workflow** 클릭 → 입력값 확인 후 실행
   - `posts`: 생성할 글 수(예: 1)
   - `generate`: `true`
   - `publish_blogger`: `false`(블로거 미설정 시)
3. 실행이 끝나면(초록 체크) 배포 URL에서 새 글 확인
4. **대시보드**: `https://<SITE_URL>/dashboard/` 에서 발행 현황·SEO/GEO 진척도 확인

> 크론은 매일 **09:00·15:00·21:00(KST)** 3회 자동 실행됩니다(하루 3편). 수동 실행은 언제든 가능합니다.

---

## STEP 5. 네이버 블로그 연결 — 1순위 (권장)

네이버는 개인 블로그 글쓰기 **공식 API가 없어** 다른 채널처럼 완전 자동화할 수 없습니다
(비공식 자동화는 이용약관 위반·계정 차단 위험이 있어 적용하지 않았습니다). 대신 아래처럼
"자동 생성 + 수동 붙여넣기"로 가장 먼저, 가장 쉽게 시작할 수 있습니다.

1. 대시보드(`https://<SITE_URL>/dashboard/#naver`) → **🟢 네이버 블로그** 탭 이동
2. **📦 통합 기획안+전체 원고 (.md)** 다운로드 (`naver-content-pack.md`)
   - 발행 스케줄 + 현재까지 작성된 모든 글의 원고가 한 파일에 담겨 있습니다
3. 네이버 블로그 관리 화면에서 새 글 작성 → 원고 내용을 복사해 붙여넣기 → 발행
4. (선택) 검색 노출을 높이려면 [네이버 서치어드바이저](https://searchadvisor.naver.com)에
   **자체 사이트**를 등록하고 사이트맵을 제출하세요(네이버 블로그 자체와는 별개로,
   자체 사이트의 네이버 검색 노출에 도움이 됩니다).

| 변수 | 값 | 설명 |
| --- | --- | --- |
| `NAVER_SITE_VERIFICATION` | (소유확인 meta content 값) | 네이버 서치어드바이저 소유확인(선택) |

> 매일 09:00·15:00·21:00 자동 생성되는 원고가 대시보드에 쌓이므로, 하루 한 번 접속해
> 새로 생긴 원고만 네이버에 옮기는 루틴을 권장합니다.

---

## STEP 6. 구글 블로거 연동 — 2순위 (선택)

자체 사이트 외에 **구글 블로거(Blogger)**에도 같은 글을 자동 발행합니다.

1. [Google Cloud Console](https://console.cloud.google.com) → 프로젝트 생성
2. **API 및 서비스 → 라이브러리 → "Blogger API v3" 사용 설정**
3. **OAuth 동의 화면** 구성(외부, 테스트 사용자에 본인 계정 추가)
4. **사용자 인증 정보 → OAuth 클라이언트 ID → 데스크톱 앱** 생성 →
   `client_id`, `client_secret` 확보
5. **refresh token 발급** ([OAuth 2.0 Playground](https://developers.google.com/oauthplayground) 사용):
   - 우측 톱니바퀴 → *Use your own OAuth credentials* 체크 → client id/secret 입력
   - 스코프에 `https://www.googleapis.com/auth/blogger` 입력 → Authorize
   - *Exchange authorization code for tokens* → **Refresh token** 복사
6. 블로거 관리페이지 URL의 `blogID=` 숫자가 **블로그 ID**
7. GitHub **Secrets** 등록

| Secret | 값 |
| --- | --- |
| `BLOGGER_BLOG_ID` | (blogID 숫자) |
| `BLOGGER_CLIENT_ID` | `...apps.googleusercontent.com` |
| `BLOGGER_CLIENT_SECRET` | (클라이언트 시크릿) |
| `BLOGGER_REFRESH_TOKEN` | (5번에서 복사) |

8. **Variables** 에 `PUBLISH_BLOGGER=true` 등록(또는 수동 실행 시 입력값으로 true)

---

## STEP 7. 워드프레스 채널 연동 — 3순위 (선택)

자체 사이트/블로거와 동일한 글을 워드프레스에도 자동 발행합니다. **호스팅 필요**
(워드프레스닷컴 비즈니스 이상 또는 자체 호스팅 WP).

1. 워드프레스 관리자 → **사용자 → 프로필 → 애플리케이션 비밀번호** 에서 새 비밀번호 발급
2. GitHub 등록

| 종류 | 이름 | 값 |
| --- | --- | --- |
| Variable | `WORDPRESS_URL` | `https://내블로그.com` |
| Variable | `WORDPRESS_USER` | 워드프레스 로그인 아이디 |
| Secret | `WORDPRESS_APP_PASSWORD` | 발급한 애플리케이션 비밀번호 |
| Variable | `WORDPRESS_STATUS` | `publish`(기본) 또는 `draft` |

3. 등록하면 이후 생성되는 글이 자동으로 WP에도 발행됩니다(수동 실행 시 `publish_wordpress=true`).

---

## STEP 8. 광고사이트 연결 — 4순위: 애드센스 · 쿠팡파트너스 · 네이버쇼핑파트너 (권장)

배너 광고(AdSense)와 제휴 마케팅(쿠팡파트너스·네이버쇼핑파트너)을 함께 붙입니다.
값은 모두 **Variables 탭**에 등록합니다(비어 있으면 렌더링 생략).

### 8-1. Google AdSense (배너 광고)
1. [AdSense](https://adsense.google.com) 가입 → 사이트 추가 → **승인 대기**
   - ⚠️ 승인에는 **독창적 콘텐츠 + 충분한 글 수 + 개인정보처리방침**이 필요합니다.
     본 사이트는 about/privacy/작성자 페이지와 표준 고지를 이미 갖췄으니,
     글이 어느 정도 쌓인 뒤(권장 15~30편) 신청하세요.
2. 승인 후 발급된 값 등록

| 변수 | 값(예시) | 설명 |
| --- | --- | --- |
| `ADSENSE_CLIENT` | `ca-pub-0000000000000000` | 게시자 ID |
| `ADSENSE_SLOT_TOP` | `1234567890` | 상단 슬롯(선택) |
| `ADSENSE_SLOT_INARTICLE` | `1234567890` | 본문 중간 슬롯(선택) |
| `ADSENSE_SLOT_BOTTOM` | `1234567890` | 하단 슬롯(선택) |

> 슬롯 ID를 비워도 `ADSENSE_CLIENT` 만 있으면 **자동 광고**가 동작합니다.
> 또한 `ADSENSE_CLIENT` 설정 시 **`ads.txt` 가 자동 생성**되어 광고 수익이 보호됩니다.

> ⚠️ **애드센스 승인 원칙**: 심사받은 그 사이트에 그대로 광고를 답니다. 미끼(그림자) 사이트로 승인 후
> 다른 사이트로 바꿔 다는 방식은 정책 위반(계정 정지 위험)이므로, **실제 사이트를 충분한 분량·품질로
> 키운 뒤 그대로 신청**하세요. 커스텀 도메인(STEP 10) 연결 시 승인에 유리합니다.

### 8-2. 쿠팡 파트너스 (제휴 마케팅)
글에서 소개한 상품에 쿠팡 링크를 걸고, 클릭 후 구매가 발생하면 수수료를 받는 방식입니다.

1. [쿠팡 파트너스](https://partners.coupang.com) 가입(쿠팡 계정 필요)
2. 승인 후 발급되는 채널(트래킹) ID 확보

| 변수 | 값 | 설명 |
| --- | --- | --- |
| `COUPANG_PARTNER_ID` | (발급된 채널 ID) | 쿠팡 파트너스 트래킹 식별자 |

> ⚠️ **필수 고지**: 쿠팡 파트너스 정책상 링크가 포함된 글에는 "이 포스팅은 쿠팡 파트너스 활동의
> 일환으로, 이에 따른 일정액의 수수료를 제공받습니다." 문구를 반드시 표시해야 합니다.
> 이 값을 등록하고 글 frontmatter에 `affiliate: ["coupang"]`을 추가하면 해당 글에 문구가 **자동 삽입**됩니다.

### 8-3. 네이버 쇼핑 파트너 (제휴 마케팅)
네이버 쇼핑 상품 링크로 동일한 방식의 수수료를 받습니다.

1. [네이버 쇼핑 파트너센터](https://shoppartner.naver.com) 가입
2. 승인 후 발급되는 파트너 채널 ID 확보

| 변수 | 값 | 설명 |
| --- | --- | --- |
| `NAVER_PARTNER_ID` | (발급된 파트너 채널 ID) | 네이버 쇼핑 파트너 식별자 |

> 쿠팡과 동일하게, `affiliate: ["naverShopping"]`을 글 frontmatter에 추가하면 고지 문구가 자동 삽입됩니다.

### 8-4. Taboola (네이티브 추천 위젯) — 선택
타뷸라 퍼블리셔 승인 후:

| 변수 | 값 | 설명 |
| --- | --- | --- |
| `TABOOLA_PUBLISHER` | `your-publisher-id` | 발급받은 퍼블리셔 식별자 |

### 8-5. Google Analytics 4 (방문 분석)
1. [GA4](https://analytics.google.com) 속성 생성 → 측정 ID(`G-XXXX`) 확보

| 변수 | 값 |
| --- | --- |
| `GA4_ID` | `G-XXXXXXXXXX` |

> 네이버 디스플레이 광고 스크립트가 있다면 `NAVER_AD_SCRIPT`(Variable)에 raw HTML 로 넣으면 글 하단에 삽입됩니다.
> 문의 이메일을 노출하려면 Variable `CONTACT_EMAIL` 을 설정하세요(승인 심사에 필요한 about/작성자/문의/개인정보처리방침 페이지는 이미 갖춰져 있습니다).

---

## STEP 9. 검색엔진 등록 — SEO/GEO 색인 (권장)

### 9-1. Google Search Console (GSC)
1. [GSC](https://search.google.com/search-console) → 속성 추가 → **URL 접두어**에 `SITE_URL` 입력
2. 소유권 확인: **HTML 태그** 방식 선택 → `content="..."` 값 복사
3. GitHub **Variables** 에 등록 → 재배포되면 메타태그가 자동 삽입됨

| 변수 | 값 |
| --- | --- |
| `GOOGLE_SITE_VERIFICATION` | (HTML 태그의 content 값) |

4. 확인 완료 후 GSC → **Sitemaps** → `sitemap.xml` 제출

### 9-2. Bing 웹마스터 도구 (Perplexity/ChatGPT 노출 기반)
1. [Bing Webmaster](https://www.bing.com/webmasters) → GSC 계정 연동 임포트(가장 쉬움)
2. 또는 사이트 추가 후 `sitemap.xml` 제출

### 9-3. IndexNow (즉시 색인) — 이미 활성화됨 ✅
기본 키가 내장되어 발행 시 자동으로 Bing 등에 알립니다. 직접 키를 쓰려면
`INDEXNOW_KEY`(Secret)를 등록하면 그 값으로 대체됩니다.

---

## STEP 10. 커스텀 도메인 연결 (선택)

1. 도메인 등록기관(DNS)에서 레코드 설정
   - 서브도메인(예: `ttip.example.com`): `CNAME` → `leejiho-pslab.github.io`
   - 루트 도메인: GitHub Pages의 A 레코드(IP 4개) 설정
2. GitHub **Variables** 변경

| 변수 | 값 |
| --- | --- |
| `SITE_CNAME` | `ttip.example.com` (CNAME 파일 자동 생성) |
| `SITE_URL` | `https://ttip.example.com` |
| `SITE_BASE_PATH` | (빈 값으로 변경) |

3. 재배포 후 **Settings → Pages → Custom domain** 에서 HTTPS 적용 확인

---

## 📋 전체 Secret/Variable 요약

**Secrets (민감값)**
- `ANTHROPIC_API_KEY` *(필수)*
- `INDEXNOW_KEY` *(선택, 미설정 시 기본 키 사용)*
- `BLOGGER_BLOG_ID`, `BLOGGER_CLIENT_ID`, `BLOGGER_CLIENT_SECRET`, `BLOGGER_REFRESH_TOKEN` *(블로거 선택)*

**Variables (공개 가능)**
- `SITE_URL`, `SITE_BASE_PATH` *(필수)*
- `CONTENT_MODEL`, `POSTS_PER_RUN`
- `ADSENSE_CLIENT`, `ADSENSE_SLOT_TOP`, `ADSENSE_SLOT_INARTICLE`, `ADSENSE_SLOT_BOTTOM`
- `COUPANG_PARTNER_ID`, `NAVER_PARTNER_ID` *(제휴 마케팅)*
- `TABOOLA_PUBLISHER`, `NAVER_AD_SCRIPT`
- `GA4_ID`, `GOOGLE_SITE_VERIFICATION`, `NAVER_SITE_VERIFICATION`
- `SITE_CNAME` *(도메인 선택)*, `PUBLISH_BLOGGER`/`PUBLISH_WORDPRESS` *(채널 선택)*
- `WORDPRESS_URL`, `WORDPRESS_USER`, `WORDPRESS_STATUS` *(워드프레스 선택)*

---

## STEP 11. 대시보드 & 수동 체크리스트 운영

- 대시보드: `https://<SITE_URL>/dashboard/`
  - 발행 현황(채널/카테고리/월별) + SEO·GEO 진척도
  - **자동 항목**은 빌드마다 실시간 재검사됩니다(현재 30/30 통과).
  - **수동 항목**(오프사이트)은 직접 진행 후 표시합니다.
- 수동 항목 완료 표시: `config/geo-checklist.json` 에서 해당 항목의
  `"status": "todo"` → `"done"`(또는 해당 없으면 `"na"`)으로 수정 후 커밋하면
  다음 빌드에서 진척도에 반영됩니다.

### 사용자가 직접 해야 하는 GEO 오프사이트 작업(요약)
검색·AI 노출을 키우려면 코드로 할 수 없는 아래 작업이 중요합니다.
- 브랜드 SNS 채널 개설 + 프로필 일관성(설정 후 `config/site.config.js` `brand.sameAs` 에 URL 추가)
- 외부 매체/커뮤니티에서의 브랜드 언급·백링크 확보
- 'Best/추천' 리스트형 콘텐츠 진입, 위키 등재
- ChatGPT/Perplexity/Gemini에 주제 질의 → 인용 여부 주기적 스냅샷
- GA4에서 LLM 리퍼러(chatgpt.com, perplexity.ai 등) 세그먼트 모니터링

---

## STEP 12. 운영 루틴 권장안

- **초기 2~4주**: `POSTS_PER_RUN=1` 로 매일 발행하며 색인 추이 관찰 → 글 15~30편 확보
- 글이 쌓이면 **애드센스 신청**
- **분기마다**: 상위 트래픽 글 정보 갱신(요금·제도 변경 반영) → `updated` 날짜 변경(IndexNow 자동 핑)
- 대시보드로 발행/진척도 점검, 수동 GEO 작업 순차 진행

---

## 🛠 트러블슈팅

- **글이 안 생겨요**: `ANTHROPIC_API_KEY` 등록 여부, Actions 로그의 generate 단계 확인. 키가 없으면 빌드만 됩니다.
- **광고가 안 보여요**: `ADSENSE_CLIENT` 등록 + 애드센스 승인 여부 확인. 미승인 상태에선 광고가 나오지 않습니다.
- **이미지가 안 나와요**: 커버는 빌드 시 실제 파일이 있을 때만 사용됩니다. CI에서 Chrome 설치 스텝이 실패하면 기본 OG로 폴백됩니다(글은 정상 발행).
- **페이지가 404**: Settings→Pages 가 `GitHub Actions` 인지, `SITE_BASE_PATH` 가 실제 경로와 맞는지 확인.
- **크론이 안 돌아요**: 스케줄 워크플로우는 기본 브랜치에 있어야 합니다(현재 충족). Actions 가 비활성화돼 있지 않은지 확인.
