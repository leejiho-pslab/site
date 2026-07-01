// =============================================================
//  정적 사이트 빌드
//  content/posts/*.md  ->  public/ (GitHub Pages 배포 대상)
//  생성물: 글 페이지, 인덱스, 카테고리, about/privacy,
//          sitemap.xml, robots.txt, rss.xml, .nojekyll, CNAME
// =============================================================
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";
import { site } from "../config/site.config.js";
import {
  ROOT, PUBLIC_DIR, ensureDir, loadPosts, excerpt, todayKST,
} from "./lib.mjs";
import { buildDashboard } from "./dashboard.mjs";
import {
  head, header, footer, url, absUrl,
  adsenseUnit, taboolaWidget, naverAd,
  articleJsonLd, breadcrumbJsonLd, faqJsonLd, organizationJsonLd, esc,
} from "./render.mjs";

marked.setOptions({ mangle: false, headerIds: false, breaks: false });

function write(rel, html) {
  const out = path.join(PUBLIC_DIR, rel);
  ensureDir(path.dirname(out));
  fs.writeFileSync(out, html, "utf8");
}

function catName(slug) {
  const c = site.categories.find((x) => x.slug === slug);
  return c ? c.name : slug;
}

// 실제 존재하는 커버 이미지 상대경로 반환(없으면 "")
function coverFor(post) {
  if (!post.image) return "";
  const srcFile = path.join(ROOT, "src", post.image.replace(/^\//, ""));
  return fs.existsSync(srcFile) ? post.image : "";
}

/** 본문 마크다운을 HTML 로 바꾸고, H2 사이에 본문 중간 광고를 1회 삽입 */
function renderBody(markdown) {
  const html = marked.parse(markdown);
  // 두 번째 <h2> 직전에 인아티클 광고 삽입 (본문이 충분히 길 때)
  const adUnit = adsenseUnit("inArticle");
  if (!adUnit) return html;
  const parts = html.split("<h2");
  if (parts.length >= 3) {
    // parts[0] + <h2..#1.. + 광고 + <h2..#2..
    return parts[0] + "<h2" + parts[1] + adUnit + "<h2" + parts.slice(2).join("<h2");
  }
  return html + adUnit;
}

function buildToc(markdown) {
  const heads = [...markdown.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
  if (heads.length < 3) return "";
  const items = heads.map((h, i) => `<li><a href="#h${i}">${esc(h)}</a></li>`).join("");
  return `<nav class="toc"><strong>목차</strong><ol>${items}</ol></nav>`;
}

/** H2 에 id 를 부여해 목차 앵커와 연결 */
function addHeadingIds(html) {
  let i = -1;
  return html.replace(/<h2>/g, () => {
    i += 1;
    return `<h2 id="h${i}">`;
  });
}

/** 각 H2 소제목 뒤에 소제목 카드 이미지를 삽입(파일이 있을 때만). 본문-연결 이미지 확보. */
function insertSectionImages(html, post) {
  return html.replace(/<h2 id="h(\d+)">([\s\S]*?)<\/h2>/g, (m, k, text) => {
    const rel = `/assets/covers/${post.slug}-s${k}.png`;
    const srcFile = path.join(ROOT, "src", rel.replace(/^\//, ""));
    if (!fs.existsSync(srcFile)) return m;
    const alt = text.replace(/<[^>]+>/g, "").trim();
    return `${m}<img class="section" src="${url(rel)}" alt="${esc(alt)} - ${esc(post.title)}" loading="lazy" width="1200" height="630">`;
  });
}

// ---------------- 개별 글 ----------------
function buildPost(post, allPosts) {
  const canonical = absUrl(post.path);
  const toc = buildToc(post.body);
  const bodyHtml = insertSectionImages(addHeadingIds(renderBody(post.body)), post);

  // 대표(커버) 이미지: src/assets 에 실제 파일이 있을 때만 사용 (깨진 이미지 방지)
  const coverRel = coverFor(post);
  const heroImg = coverRel
    ? `<img class="hero" src="${url(coverRel)}" alt="${esc(post.imageAlt || post.title)}" width="1200" height="630" loading="eager">`
    : "";

  const related = allPosts
    .filter((p) => p.path !== post.path && p.category === post.category)
    .slice(0, 5);
  const relatedHtml = related.length
    ? `<section class="related"><h2>함께 보면 좋은 글</h2><ul>${related
        .map((p) => `<li><a href="${url(p.path)}">${esc(p.title)}</a></li>`)
        .join("")}</ul></section>`
    : "";

  const faqHtml =
    post.faqs && post.faqs.length
      ? `<section class="related"><h2>자주 묻는 질문</h2>${post.faqs
          .map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`)
          .join("")}</section>`
      : "";

  const jsonld = [
    articleJsonLd({ ...post, image: coverRel ? absUrl(coverRel) : undefined }),
    breadcrumbJsonLd([
      { name: "홈", path: "/" },
      { name: catName(post.category), path: `/category/${post.category}/` },
      { name: post.title, path: post.path },
    ]),
    faqJsonLd(post.faqs),
  ]
    .filter(Boolean)
    .join("</script>\n<script type=\"application/ld+json\">");

  const html =
    head({
      title: post.title,
      description: post.description,
      canonical,
      type: "article",
      image: coverRel ? absUrl(coverRel) : undefined,
      jsonld,
    }) +
    header() +
    `<article class="post">
      <span class="card cat" style="border:0;padding:0">
        <a href="${url(`/category/${post.category}/`)}" class="cat">${esc(catName(post.category))}</a>
      </span>
      <h1>${esc(post.title)}</h1>
      <div class="meta">게시일 ${esc(post.date)}${
        post.updated && post.updated !== post.date ? ` · 최종 검토 ${esc(post.updated)}` : ""
      } · <a href="${url("/author/")}" rel="author">${esc(site.authorProfile?.name || site.author)}</a></div>
      ${heroImg}
      ${post.summary ? `<blockquote class="summary"><strong>핵심 요약</strong><br>${esc(post.summary)}</blockquote>` : ""}
      ${adsenseUnit("top")}
      ${toc}
      ${bodyHtml}
      ${adsenseUnit("bottom")}
      ${faqHtml}
      ${taboolaWidget()}
      ${naverAd()}
      ${relatedHtml}
    </article>` +
    footer();

  write(path.join(post.path, "index.html"), html);
}

// ---------------- 목록(카드) ----------------
function postCard(p) {
  const cover = coverFor(p);
  const thumb = cover
    ? `<a href="${url(p.path)}" class="thumb"><img src="${url(cover)}" alt="${esc(p.imageAlt || p.title)}" loading="lazy" width="1200" height="630"></a>`
    : "";
  return `<li class="card">
    ${thumb}
    <a href="${url(`/category/${p.category}/`)}" class="cat">${esc(catName(p.category))}</a>
    <h2><a href="${url(p.path)}">${esc(p.title)}</a></h2>
    <p class="excerpt">${esc(p.description || excerpt(p.body))}</p>
    <div class="meta">${esc(p.date)}</div>
  </li>`;
}

function buildIndex(posts) {
  const chips = site.categories
    .map((c) => `<a class="chip" href="${url(`/category/${c.slug}/`)}">${esc(c.name)}</a>`)
    .join("");
  const list = posts.length
    ? `<ul class="post-list">${posts.map(postCard).join("")}</ul>`
    : `<p>아직 발행된 글이 없습니다. 곧 새로운 생활정보로 찾아뵙겠습니다.</p>`;
  const html =
    head({
      title: site.name,
      description: site.description,
      canonical: absUrl("/"),
      jsonld: organizationJsonLd(),
    }) +
    header() +
    `<section>
       <h1 style="font-size:24px">${esc(site.tagline)}</h1>
       <div class="chips">${chips}</div>
       ${adsenseUnit("top")}
       ${list}
     </section>` +
    footer();
  write("index.html", html);
}

function buildCategories(posts) {
  for (const c of site.categories) {
    const items = posts.filter((p) => p.category === c.slug);
    const list = items.length
      ? `<ul class="post-list">${items.map(postCard).join("")}</ul>`
      : `<p>이 카테고리에는 아직 글이 없습니다.</p>`;
    const html =
      head({
        title: `${c.name} 정보 모음`,
        description: `${c.name} - ${c.desc}`,
        canonical: absUrl(`/category/${c.slug}/`),
      }) +
      header() +
      `<h1 style="font-size:24px">${esc(c.name)}</h1>
       <p style="color:var(--muted)">${esc(c.desc)}</p>
       ${adsenseUnit("top")}
       ${list}` +
      footer();
    write(path.join("category", c.slug, "index.html"), html);
  }
}

// ---------------- 정적 페이지 ----------------
function buildStaticPages() {
  const about =
    head({ title: "사이트 소개", description: `${site.name} 소개`, canonical: absUrl("/about/") }) +
    header() +
    `<article class="post"><h1>사이트 소개</h1>
      <p>${esc(site.name)}는 ${esc(site.description)}</p>
      <p>공공요금·환급·지원금·생활 절약 등 실생활에 바로 쓰는 정보를 쉽고 정확하게 전달하는 것을 목표로 합니다.</p>
      <h2>운영 원칙</h2>
      <ul>
        <li>정확한 정보 제공을 위해 공식 출처 확인을 권장합니다.</li>
        <li>제도·요금 정보는 변경될 수 있어 최신 공식 안내를 함께 안내합니다.</li>
        <li>독자에게 도움이 되는 콘텐츠를 최우선으로 합니다.</li>
      </ul>
    </article>` +
    footer();
  write("about/index.html", about);

  const ap = site.authorProfile || {};
  const authorPage =
    head({
      title: `${ap.name} - 작성자 소개`,
      description: ap.bio,
      canonical: absUrl("/author/"),
      jsonld: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Person",
        name: ap.name,
        jobTitle: ap.jobTitle,
        description: ap.bio,
        url: absUrl("/author/"),
        worksFor: { "@type": "Organization", name: site.name },
        sameAs: ap.sameAs && ap.sameAs.length ? ap.sameAs : undefined,
      }),
    }) +
    header() +
    `<article class="post"><h1>${esc(ap.name)}</h1>
      <p class="meta">${esc(ap.jobTitle || "")}</p>
      <p>${esc(ap.bio || "")}</p>
      <h2>편집 원칙</h2>
      <ul>
        <li>공식 기관(정부·지자체·공공기관) 자료를 우선 확인합니다.</li>
        <li>제도·요금 등 변동 정보는 기준 시점과 출처를 함께 안내합니다.</li>
        <li>독자가 바로 활용할 수 있도록 실용성과 정확성을 우선합니다.</li>
      </ul>
    </article>` +
    footer();
  write("author/index.html", authorPage);

  const privacy =
    head({ title: "개인정보처리방침", description: "개인정보처리방침", canonical: absUrl("/privacy/") }) +
    header() +
    `<article class="post"><h1>개인정보처리방침</h1>
      <p>본 사이트는 이용자의 개인정보를 직접 수집하지 않습니다. 다만 광고 및 분석 서비스 이용을 위해
         쿠키가 사용될 수 있습니다.</p>
      <h2>광고 및 쿠키</h2>
      <p>본 사이트는 Google AdSense 등 제3자 광고를 게재하며, 광고 제공업체는 쿠키를 사용해
         이용자의 관심사에 기반한 광고를 제공할 수 있습니다. 이용자는 브라우저 설정을 통해 쿠키를
         거부할 수 있습니다.</p>
      <h2>광고 게재</h2>
      <p>Google을 비롯한 제3자 광고 사업자는 쿠키를 사용하여 이용자의 이전 방문 기록에 기반한 광고를
         게재합니다. 이용자는 <a href="https://www.google.com/settings/ads" rel="nofollow">광고 설정</a>에서
         맞춤 광고를 해제할 수 있습니다.</p>
      <h2>분석 도구</h2>
      <p>본 사이트는 방문 통계 분석을 위해 Google Analytics를 사용할 수 있습니다.</p>
      <h2>문의</h2>
      <p>개인정보 관련 문의는 사이트 운영자에게 연락해 주시기 바랍니다.</p>
    </article>` +
    footer();
  write("privacy/index.html", privacy);

  // 문의(contact) 페이지 — 애드센스 심사 시 권장
  const contact =
    head({ title: "문의하기", description: `${site.name} 문의 안내`, canonical: absUrl("/contact/") }) +
    header() +
    `<article class="post"><h1>문의하기</h1>
      <p>${esc(site.name)}에 대한 문의, 정보 정정 요청, 제휴 제안은 아래로 연락해 주세요.</p>
      ${site.contactEmail
        ? `<p><strong>이메일:</strong> <a href="mailto:${esc(site.contactEmail)}">${esc(site.contactEmail)}</a></p>`
        : `<p>이메일: 준비 중입니다. (운영자가 곧 연락처를 안내할 예정입니다.)</p>`}
      <h2>정보 정정 안내</h2>
      <p>본 사이트의 생활정보는 공식 자료를 바탕으로 작성하지만, 제도·요금·신청 기준은 수시로 바뀔 수 있습니다.
         잘못된 정보를 발견하시면 알려주시면 신속히 확인·수정하겠습니다.</p>
    </article>` +
    footer();
  write("contact/index.html", contact);

  // 커스텀 404 (GitHub Pages 가 미존재 경로에 자동 사용)
  const chips = site.categories
    .map((c) => `<a class="chip" href="${url(`/category/${c.slug}/`)}">${esc(c.name)}</a>`)
    .join("");
  const notFound =
    head({ title: "페이지를 찾을 수 없습니다 (404)", description: "요청하신 페이지를 찾을 수 없습니다.", canonical: absUrl("/404.html") }) +
    header() +
    `<article class="post" style="text-align:center">
      <h1 style="font-size:64px;margin:20px 0 0">404</h1>
      <p>요청하신 페이지를 찾을 수 없습니다.</p>
      <p><a href="${url("/")}">홈으로 돌아가기</a></p>
      <div class="chips" style="justify-content:center;margin-top:24px">${chips}</div>
    </article>` +
    footer();
  write("404.html", notFound);
}

// ---------------- SEO 산출물 ----------------
function buildSitemap(posts) {
  // 모든 URL 에 lastmod 부여 (체크리스트: sitemap <lastmod> 포함)
  const latest = posts.length ? posts[0].updated || posts[0].date : todayKST();
  const catLast = (slug) => {
    const inCat = posts.filter((p) => p.category === slug);
    return inCat.length ? inCat[0].updated || inCat[0].date : latest;
  };
  const urls = [
    { loc: absUrl("/"), pri: "1.0", lastmod: latest },
    { loc: absUrl("/about/"), pri: "0.3", lastmod: latest },
    { loc: absUrl("/author/"), pri: "0.3", lastmod: latest },
    { loc: absUrl("/contact/"), pri: "0.3", lastmod: latest },
    { loc: absUrl("/privacy/"), pri: "0.3", lastmod: latest },
    ...site.categories.map((c) => ({
      loc: absUrl(`/category/${c.slug}/`), pri: "0.6", lastmod: catLast(c.slug),
    })),
    ...posts.map((p) => ({ loc: absUrl(p.path), pri: "0.8", lastmod: p.updated || p.date })),
  ];
  const body = urls
    .map(
      (u) =>
        `<url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.pri}</priority></url>`
    )
    .join("\n");
  write(
    "sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
  );
}

// AI/LLM 크롤러를 명시적으로 허용 (체크리스트: robots 가 에이전트/LLM 허용)
const AI_BOTS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-Web",
  "anthropic-ai", "PerplexityBot", "Perplexity-User", "Google-Extended",
  "Applebot-Extended", "Bingbot", "CCBot", "Amazonbot", "Bytespider",
];
function buildRobots() {
  const aiBlocks = AI_BOTS.map((b) => `User-agent: ${b}\nAllow: /`).join("\n\n");
  write(
    "robots.txt",
    `# 모든 검색/AI 크롤러 허용\nUser-agent: *\nAllow: /\n\n${aiBlocks}\n\nSitemap: ${absUrl(
      "/sitemap.xml"
    )}\n`
  );
}

// llms.txt — LLM 친화 사이트 요약 (GEO 표준). 사이트 핵심/주요 링크 안내.
function buildLlmsTxt(posts) {
  const cats = site.categories
    .map((c) => `- [${c.name}](${absUrl(`/category/${c.slug}/`)}): ${c.desc}`)
    .join("\n");
  const recent = posts
    .slice(0, 15)
    .map((p) => `- [${p.title}](${absUrl(p.path)}): ${p.description || ""}`)
    .join("\n");
  write(
    "llms.txt",
    `# ${site.name}

> ${site.description}

${site.name}는 ${site.niche} 분야의 정보를 공식 자료 기반으로 검증해 제공합니다.
운영: ${site.author}. 언어: 한국어.

## 카테고리
${cats}

## 최근 콘텐츠
${recent}

## 안내
- 모든 콘텐츠는 공식 기관 자료 확인을 권장합니다(제도·요금은 변동 가능).
- 인용 시 출처로 ${site.name}(${absUrl("/")})를 표기해 주세요.
`
  );
}

// ads.txt — 애드센스 승인 후 광고 수익 보호(무단 인벤토리 차단). client 있을 때만.
function buildAdsTxt() {
  const client = site.ads.adsense.client;
  if (!client || client.includes("XXXX")) return;
  const pub = client.replace(/^ca-/, ""); // ca-pub-XXX -> pub-XXX
  write("ads.txt", `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`);
}

// IndexNow 키 파일 (Bing/Yandex 등 즉시 인덱싱). config.indexNowKey 또는 환경변수.
function buildIndexNow() {
  const key = site.indexNowKey;
  if (!key) return;
  write(`${key}.txt`, key + "\n");
}

function buildRss(posts) {
  const items = posts
    .slice(0, 20)
    .map(
      (p) => `  <item>
    <title>${esc(p.title)}</title>
    <link>${absUrl(p.path)}</link>
    <guid>${absUrl(p.path)}</guid>
    <pubDate>${new Date(p.date).toUTCString()}</pubDate>
    <description>${esc(p.description || excerpt(p.body))}</description>
  </item>`
    )
    .join("\n");
  write(
    "rss.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>${esc(site.name)}</title>
  <link>${absUrl("/")}</link>
  <description>${esc(site.description)}</description>
  <language>ko</language>
${items}
</channel></rss>\n`
  );
}

function copyAssets() {
  const destAssets = path.join(PUBLIC_DIR, "assets");
  ensureDir(destAssets);
  fs.copyFileSync(
    path.join(ROOT, "src", "styles", "main.css"),
    path.join(destAssets, "main.css")
  );
  // src/assets/** (로고/OG/파비콘/커버) 전체 복사
  const srcAssets = path.join(ROOT, "src", "assets");
  if (fs.existsSync(srcAssets)) {
    fs.cpSync(srcAssets, destAssets, { recursive: true });
  }
  // GitHub Pages 가 Jekyll 처리를 건너뛰도록
  fs.writeFileSync(path.join(PUBLIC_DIR, ".nojekyll"), "");
  // 커스텀 도메인 설정 시 CNAME 생성
  if (process.env.SITE_CNAME) {
    fs.writeFileSync(path.join(PUBLIC_DIR, "CNAME"), process.env.SITE_CNAME.trim() + "\n");
  }
}

function build() {
  if (fs.existsSync(PUBLIC_DIR)) fs.rmSync(PUBLIC_DIR, { recursive: true, force: true });
  ensureDir(PUBLIC_DIR);

  const posts = loadPosts();
  for (const p of posts) buildPost(p, posts);
  buildIndex(posts);
  buildCategories(posts);
  buildStaticPages();
  buildSitemap(posts);
  buildRobots();
  buildLlmsTxt(posts);
  buildIndexNow();
  buildAdsTxt();
  buildRss(posts);
  copyAssets();
  buildDashboard(); // public/ 완성 후 감사+대시보드 생성

  console.log(`[build] 완료: 글 ${posts.length}편 + 인덱스/카테고리/SEO 산출물 + 대시보드 -> public/`);
}

build();
