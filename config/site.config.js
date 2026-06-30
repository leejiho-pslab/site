// =============================================================
//  사이트 전역 설정
//  - 배포/광고/채널/SEO 관련 모든 설정을 한 곳에서 관리
//  - 광고 ID, GA ID 등 공개돼도 되는 값은 여기에,
//    API 키/토큰 등 비밀값은 환경변수(.env / GitHub Secrets)로 관리
// =============================================================

export const site = {
  // ---- 기본 메타 ----
  // GitHub Pages 커스텀 도메인 사용 시 해당 도메인으로 교체.
  // 커스텀 도메인 미사용 시: https://<USERNAME>.github.io/<REPO>
  name: "오늘의 꿀팁",
  tagline: "매일 쓰는 생활정보·꿀팁 모음",
  description:
    "공공요금, 환급, 지원금, 생활 절약, 신청 방법까지 — 실생활에 바로 쓰는 생활정보와 꿀팁을 매일 발행합니다.",
  // 배포 URL (끝에 슬래시 없이). 환경변수로 덮어쓸 수 있음.
  url: process.env.SITE_URL || "https://leejiho-pslab.github.io/site",
  // GitHub Pages 프로젝트 페이지로 배포 시 base path (예: "/site").
  // 커스텀 도메인 또는 user.github.io 루트 배포면 "" 로 둔다.
  basePath: process.env.SITE_BASE_PATH ?? "/site",
  lang: "ko",
  locale: "ko_KR",
  author: "오늘의 꿀팁 편집부",
  timezone: "Asia/Seoul",

  // ---- 니치/카테고리 (생활정보·꿀팁) ----
  niche: "생활정보/꿀팁",
  categories: [
    { slug: "money", name: "공공요금·환급", desc: "전기·가스·수도요금, 세금 환급, 절약 정보" },
    { slug: "support", name: "지원금·정책", desc: "정부지원금, 보조금, 신청 자격과 방법" },
    { slug: "life", name: "생활꿀팁", desc: "집안일, 정리수납, 생활 속 절약 노하우" },
    { slug: "season", name: "계절·시즌", desc: "월별 시즌 이슈, 명절, 계절 준비 정보" },
    { slug: "howto", name: "신청·방법", desc: "각종 신청·발급·예약 방법 안내" },
  ],

  // ---- 수익화: 광고 네트워크 ----
  // 실제 발급받은 ID로 교체. 빈 값이면 해당 광고는 렌더링되지 않음.
  ads: {
    adsense: {
      enabled: true,
      client: process.env.ADSENSE_CLIENT || "ca-pub-XXXXXXXXXXXXXXXX",
      // 자동 광고(Auto ads) 사용 여부 — true면 본문 자동 삽입
      autoAds: true,
      // 수동 슬롯 ID (위치별). 발급 후 채워넣기.
      slots: {
        top: process.env.ADSENSE_SLOT_TOP || "",
        inArticle: process.env.ADSENSE_SLOT_INARTICLE || "",
        bottom: process.env.ADSENSE_SLOT_BOTTOM || "",
        sidebar: process.env.ADSENSE_SLOT_SIDEBAR || "",
      },
    },
    taboola: {
      enabled: true,
      // 타뷸라 발급 정보 (publisher 이름, container/placement)
      publisher: process.env.TABOOLA_PUBLISHER || "",
      // 글 하단 추천 위젯 placement 이름
      placement: process.env.TABOOLA_PLACEMENT || "Below Article Thumbnails",
      mode: process.env.TABOOLA_MODE || "thumbnails-a",
      containerId: "taboola-below-article-thumbnails",
    },
    // 네이버 광고(미디어믹스/파워컨텐츠 등) — 자체 사이트엔 보통 애드포스트가 아닌
    // 디스플레이 스크립트를 넣음. 발급 스크립트가 있으면 raw HTML 으로 넣기.
    naver: {
      enabled: false,
      script: process.env.NAVER_AD_SCRIPT || "",
    },
  },

  // ---- 분석/검증 ----
  analytics: {
    ga4: process.env.GA4_ID || "", // 예: G-XXXXXXXXXX
    naverWebmaster: process.env.NAVER_SITE_VERIFICATION || "",
    googleSiteVerification: process.env.GOOGLE_SITE_VERIFICATION || "",
  },

  // ---- 브랜드 엔티티 (Organization 스키마 / GEO) ----
  brand: {
    foundingDate: "2026",
    // 공식 소셜/외부 프로필 (개설 후 실제 URL 로 교체). Organization sameAs 로 출력.
    sameAs: [
      // "https://www.youtube.com/@오늘의꿀팁",
      // "https://www.instagram.com/오늘의꿀팁",
      // "https://www.threads.net/@오늘의꿀팁",
    ].filter(Boolean),
    // 검색창 SearchAction (사이트 내 검색 페이지가 있을 때만 의미)
    searchUrlTemplate: "",
  },

  // ---- 작성자 프로필 (author 스키마 / E-E-A-T) ----
  authorProfile: {
    name: "오늘의 꿀팁 편집부",
    url: "/author/", // 작성자 소개 페이지
    jobTitle: "생활정보 에디터",
    bio: "생활정보·공공요금·지원금 분야의 정보를 공식 자료 기반으로 검증해 쉽게 전달합니다.",
    sameAs: [].filter(Boolean),
  },

  // ---- 채널 ----
  channels: {
    site: { enabled: true }, // GitHub Pages 자체 사이트
    blogger: {
      enabled: true,
      blogId: process.env.BLOGGER_BLOG_ID || "", // 구글 블로거 블로그 ID
      // 발행 시 라벨(블로거 카테고리)
      defaultLabels: ["생활정보", "꿀팁"],
    },
    naver: { enabled: false }, // 공식 글쓰기 API 부재로 현재 제외
  },

  // ---- GitHub 정보 (대시보드 편집 링크용) ----
  github: {
    repo: process.env.GITHUB_REPOSITORY || "leejiho-pslab/site",
    branch: process.env.GITHUB_REF_NAME || "claude/seo-monetization-site-0g52e1",
  },

  // ---- IndexNow (즉시 인덱싱 키) ----
  // 공개돼도 되는 식별자(키 파일 자체가 공개됨). 환경변수로 덮어쓸 수 있음.
  indexNowKey: process.env.INDEXNOW_KEY || "k7m2p9x4q1w8e3r6t5y0u7i2o9a4s1d8",

  // ---- 발행 정책 ----
  publishing: {
    // 1회 실행 시 생성/발행할 글 수
    postsPerRun: Number(process.env.POSTS_PER_RUN || 1),
    // 글 1편 목표 글자수 (한국어 기준)
    targetChars: 2200,
  },
};

export default site;
