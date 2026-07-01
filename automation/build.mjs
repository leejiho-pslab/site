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
  ROOT, PUBLIC_DIR, ensureDir, loadPosts, excerpt, todayKST, slugify,
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
function buildPost(post, allPosts, validTags = new Set()) {
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

  const tagLinks = (post.tags || [])
    .filter((t) => validTags.has(t))
    .map((t) => `<a class="chip" href="${url(`/tag/${slugify(t)}/`)}">#${esc(t)}</a>`)
    .join("");
  const tagsHtml = tagLinks ? `<div class="chips" style="margin-top:22px">${tagLinks}</div>` : "";

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
      ${tagsHtml}
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

const PER_PAGE = 12;
function chunkPages(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out.length ? out : [[]];
}
// base 는 "/" 또는 "/category/slug/" 처럼 슬래시로 끝남
function pager(base, page, total) {
  if (total <= 1) return "";
  const href = (p) => url(p === 1 ? base : `${base}page/${p}/`);
  const item = (p, label, on) =>
    on ? `<a class="pg" href="${href(p)}">${label}</a>` : `<span class="pg disabled">${label}</span>`;
  let nums = "";
  for (let i = 1; i <= total; i++)
    nums += i === page ? `<span class="pg cur">${i}</span>` : `<a class="pg" href="${href(i)}">${i}</a>`;
  return `<nav class="pager">${item(page - 1, "‹ 이전", page > 1)}${nums}${item(page + 1, "다음 ›", page < total)}</nav>`;
}

function buildIndex(posts) {
  const chips = site.categories
    .map((c) => `<a class="chip" href="${url(`/category/${c.slug}/`)}">${esc(c.name)}</a>`)
    .join("");
  const pages = chunkPages(posts, PER_PAGE);
  pages.forEach((items, idx) => {
    const page = idx + 1;
    const rel = page === 1 ? "/" : `/page/${page}/`;
    const list = items.length
      ? `<ul class="post-list">${items.map(postCard).join("")}</ul>`
      : `<p>아직 발행된 글이 없습니다. 곧 새로운 생활정보로 찾아뵙겠습니다.</p>`;
    const html =
      head({
        title: page === 1 ? site.name : `${site.name} (${page}페이지)`,
        description: site.description,
        canonical: absUrl(rel),
        jsonld: page === 1 ? organizationJsonLd() : "",
      }) +
      header() +
      `<section>
         <h1 style="font-size:24px">${esc(site.tagline)}</h1>
         <div class="chips">${chips}</div>
         ${adsenseUnit("top")}
         ${list}
         ${pager("/", page, pages.length)}
       </section>` +
      footer();
    write(page === 1 ? "index.html" : path.join("page", String(page), "index.html"), html);
  });
}

function buildCategories(posts) {
  for (const c of site.categories) {
    const items = posts.filter((p) => p.category === c.slug);
    const base = `/category/${c.slug}/`;
    const pages = chunkPages(items, PER_PAGE);
    pages.forEach((pageItems, idx) => {
      const page = idx + 1;
      const rel = page === 1 ? base : `${base}page/${page}/`;
      const list = pageItems.length
        ? `<ul class="post-list">${pageItems.map(postCard).join("")}</ul>`
        : `<p>이 카테고리에는 아직 글이 없습니다.</p>`;
      const html =
        head({
          title: page === 1 ? `${c.name} 정보 모음` : `${c.name} 정보 모음 (${page}페이지)`,
          description: `${c.name} - ${c.desc}`,
          canonical: absUrl(rel),
        }) +
        header() +
        `<h1 style="font-size:24px">${esc(c.name)}</h1>
         <p style="color:var(--muted)">${esc(c.desc)}</p>
         ${adsenseUnit("top")}
         ${list}
         ${pager(base, page, pages.length)}` +
        footer();
      write(page === 1 ? path.join("category", c.slug, "index.html")
        : path.join("category", c.slug, "page", String(page), "index.html"), html);
    });
  }
}

// 태그 페이지 (2편 이상 태그만 — 얇은 페이지 방지). 반환: {slug,tag} 목록(사이트맵용)
function buildTags(posts) {
  const map = new Map();
  for (const p of posts)
    for (const t of p.tags || []) {
      const k = (t || "").trim();
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(p);
    }
  const built = [];
  for (const [tag, ps] of map) {
    if (ps.length < 2) continue;
    const slug = slugify(tag);
    if (!slug || built.find((b) => b.slug === slug)) continue;
    const list = `<ul class="post-list">${ps.map(postCard).join("")}</ul>`;
    const html =
      head({
        title: `${tag} 관련 글`,
        description: `${tag} 태그가 붙은 ${site.niche} 글 모음`,
        canonical: absUrl(`/tag/${slug}/`),
      }) +
      header() +
      `<h1 style="font-size:24px"># ${esc(tag)}</h1>
       ${adsenseUnit("top")}
       ${list}` +
      footer();
    write(path.join("tag", slug, "index.html"), html);
    built.push({ slug, tag });
  }
  return built;
}

// 사이트 내 검색: 검색 인덱스(JSON) + 검색 페이지(클라이언트 필터)
function buildSearch(posts) {
  const index = posts.map((p) => ({
    t: p.title,
    u: url(p.path),
    c: catName(p.category),
    e: (p.description || excerpt(p.body)).slice(0, 120),
    g: (p.tags || []).join(" "),
  }));
  write(path.join("search", "index.json"), JSON.stringify(index));
  const html =
    head({ title: "검색", description: `${site.name} 사이트 내 검색`, canonical: absUrl("/search/") }) +
    header() +
    `<section>
      <h1 style="font-size:24px">검색</h1>
      <input id="q" class="search-box" type="search" placeholder="찾고 싶은 생활정보를 입력하세요 (예: 전기요금, 지원금)">
      <div id="search-results"><p class="mini" style="color:var(--muted)">검색어를 입력하면 결과가 표시됩니다.</p></div>
    </section>
    <script>
    (function(){
      var box=document.getElementById('q'), out=document.getElementById('search-results'), data=[];
      function esc(s){return (s||'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
      function render(q){
        q=(q||'').trim().toLowerCase();
        if(!q){out.innerHTML='<p class="mini" style="color:var(--muted)">검색어를 입력하면 결과가 표시됩니다.</p>';return;}
        var r=data.filter(function(d){return (d.t+' '+d.c+' '+d.e+' '+d.g).toLowerCase().indexOf(q)>-1;}).slice(0,50);
        if(!r.length){out.innerHTML='<p class="mini" style="color:var(--muted)">\\''+esc(q)+'\\' 검색 결과가 없습니다.</p>';return;}
        out.innerHTML='<ul class="post-list">'+r.map(function(d){return '<li class="card"><span class="cat">'+esc(d.c)+'</span><h2><a href="'+d.u+'">'+esc(d.t)+'</a></h2><p class="excerpt">'+esc(d.e)+'</p></li>';}).join('')+'</ul>';
      }
      fetch('index.json').then(function(x){return x.json();}).then(function(j){data=j;
        var p=new URLSearchParams(location.search).get('q'); if(p){box.value=p; render(p);}
      });
      box.addEventListener('input',function(){render(box.value);});
    })();
    </script>` +
    footer();
  write(path.join("search", "index.html"), html);
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
    head({ title: "개인정보처리방침", description: `${site.name} 개인정보처리방침`, canonical: absUrl("/privacy/") }) +
    header() +
    `<article class="post"><h1>개인정보처리방침</h1>
      <p>${esc(site.name)}(이하 "사이트")는 이용자의 개인정보를 소중히 다루며, 회원가입·직접적인 개인정보
         수집 절차를 두지 않습니다. 다만 광고 및 트래픽 분석을 위해 아래와 같이 쿠키가 사용될 수 있습니다.</p>

      <h2>1. 수집하는 정보</h2>
      <p>사이트는 이름·연락처 등 개인식별정보를 직접 수집하지 않습니다. 방문 분석·광고 게재 과정에서
         브라우저 종류, 방문 페이지, 대략적 위치 등 비식별 정보가 쿠키를 통해 수집될 수 있습니다.</p>

      <h2>2. 쿠키(Cookie) 사용</h2>
      <p>쿠키는 이용자 브라우저에 저장되는 작은 텍스트 파일입니다. 이용자는 브라우저 설정에서 쿠키 저장을
         거부하거나 삭제할 수 있으며, 이 경우 일부 기능 이용에 제한이 있을 수 있습니다.</p>

      <h2>3. 제3자 광고 및 DART 쿠키 (Google AdSense)</h2>
      <ul>
        <li>본 사이트는 Google 등 제3자 광고 사업자의 광고를 게재합니다.</li>
        <li>Google을 포함한 제3자 광고 사업자는 <strong>쿠키(DART 쿠키 등)</strong>를 사용하여 이용자의
            이전 방문 기록을 바탕으로 맞춤형 광고를 제공합니다.</li>
        <li>이용자는 <a href="https://policies.google.com/technologies/ads" rel="nofollow" target="_blank">Google 광고 정책</a> 및
            <a href="https://www.google.com/settings/ads" rel="nofollow" target="_blank">Google 광고 설정</a>에서
            맞춤형 광고를 해제할 수 있습니다.</li>
        <li>제3자 공급업체의 쿠키 사용은 <a href="https://www.aboutads.info" rel="nofollow" target="_blank">aboutads.info</a>에서
            일괄 해제할 수 있습니다.</li>
      </ul>

      <h2>4. 분석 도구</h2>
      <p>본 사이트는 방문 통계 분석을 위해 Google Analytics(GA4)를 사용합니다. 수집된 데이터는 통계 목적의
         비식별 정보이며, 개인을 특정하지 않습니다.</p>

      <h2>5. 아동의 개인정보</h2>
      <p>본 사이트는 만 14세 미만 아동을 대상으로 하지 않으며, 아동의 개인정보를 고의로 수집하지 않습니다.</p>

      <h2>6. 방침 변경 및 문의</h2>
      <p>본 방침은 관련 법령 및 서비스 변경에 따라 개정될 수 있으며, 변경 시 본 페이지를 통해 고지합니다.
         개인정보 관련 문의는 <a href="${url("/contact/")}">문의 페이지</a>를 이용해 주세요.</p>
    </article>` +
    footer();
  write("privacy/index.html", privacy);

  // 이용약관 · 면책조항 (애드센스 심사 신뢰도)
  const terms =
    head({ title: "이용약관 및 면책조항", description: `${site.name} 이용약관 및 면책조항`, canonical: absUrl("/terms/") }) +
    header() +
    `<article class="post"><h1>이용약관 및 면책조항</h1>
      <h2>1. 목적</h2>
      <p>본 약관은 ${esc(site.name)}(이하 "사이트")가 제공하는 콘텐츠 이용에 관한 조건을 규정합니다.</p>
      <h2>2. 콘텐츠의 성격 및 면책</h2>
      <ul>
        <li>사이트의 모든 정보는 <strong>일반적인 참고용</strong>이며, 법률·세무·의료·금융 등 전문적 조언을 대체하지 않습니다.</li>
        <li>제도·요금·지원금·신청 기준 등은 수시로 변경될 수 있으므로, 실제 이용 전 반드시 <strong>해당 기관의 공식 안내</strong>를 확인하시기 바랍니다.</li>
        <li>사이트는 정보의 정확성·완전성을 위해 노력하지만, 이를 보증하지 않으며 정보 이용으로 발생한 손해에 대해 책임지지 않습니다.</li>
      </ul>
      <h2>3. 저작권</h2>
      <p>사이트에 게시된 콘텐츠의 저작권은 ${esc(site.name)}에 있으며, 무단 복제·배포를 금합니다. 인용 시 출처를 표기해 주세요.</p>
      <h2>4. 광고</h2>
      <p>사이트는 제3자 광고를 게재하며, 이를 통해 운영 수익을 얻을 수 있습니다. 광고 관련 쿠키 정책은
         <a href="${url("/privacy/")}">개인정보처리방침</a>을 참고하세요.</p>
      <h2>5. 문의</h2>
      <p>약관 관련 문의는 <a href="${url("/contact/")}">문의 페이지</a>를 이용해 주세요.</p>
    </article>` +
    footer();
  write("terms/index.html", terms);

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
function buildSitemap(posts, tags = []) {
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
    { loc: absUrl("/terms/"), pri: "0.3", lastmod: latest },
    { loc: absUrl("/search/"), pri: "0.4", lastmod: latest },
    ...site.categories.map((c) => ({
      loc: absUrl(`/category/${c.slug}/`), pri: "0.6", lastmod: catLast(c.slug),
    })),
    ...tags.map((t) => ({ loc: absUrl(`/tag/${t.slug}/`), pri: "0.5", lastmod: latest })),
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
  // 2편 이상 태그만 페이지화 (얇은 페이지 방지) + 글 페이지 태그 링크용 집합
  const tagCount = {};
  for (const p of posts) for (const t of p.tags || []) tagCount[t] = (tagCount[t] || 0) + 1;
  const validTags = new Set(Object.entries(tagCount).filter(([, n]) => n >= 2).map(([t]) => t));

  for (const p of posts) buildPost(p, posts, validTags);
  buildIndex(posts);
  buildCategories(posts);
  const tags = buildTags(posts);
  buildSearch(posts);
  buildStaticPages();
  buildSitemap(posts, tags);
  buildRobots();
  buildLlmsTxt(posts);
  buildIndexNow();
  buildAdsTxt();
  buildRss(posts);
  copyAssets();
  buildDashboard(); // public/ 완성 후 감사+대시보드 생성

  console.log(
    `[build] 완료: 글 ${posts.length}편 + 태그 ${tags.length} + 검색/인덱스/카테고리/SEO + 대시보드 -> public/`
  );
}

build();
