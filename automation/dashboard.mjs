// =============================================================
//  모니터링 대시보드 생성
//  - 발행 현황(채널별/카테고리별/월별) + GEO/SEO 체크리스트 진척도
//  - 자동 항목은 audit.mjs 실시간 검사 결과, 수동 항목은 체크리스트 status
//  - 결과: public/dashboard/index.html (noindex) + dashboard/data.json
//  ※ build.mjs 마지막 단계에서 호출(=public/ 완성 후)
// =============================================================
import fs from "node:fs";
import path from "node:path";
import { site } from "../config/site.config.js";
import { PUBLIC_DIR, ROOT, ensureDir, loadPosts, readJson, todayKST, nowKST } from "./lib.mjs";
import { runAudit } from "./audit.mjs";
import { pickTopics } from "./topic-picker.mjs";
import { listTopicsForDashboard, editorialNotes } from "./requests.mjs";

function esc(s = "") {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function catName(slug) {
  const c = site.categories.find((x) => x.slug === slug);
  return c ? c.name : slug;
}

// ---- 데이터 집계 ----
function collect() {
  const posts = loadPosts();
  const audit = runAudit();
  const checklist = readJson(path.join(ROOT, "config", "geo-checklist.json"));

  // 체크리스트 병합 + 진척도
  let total = 0, done = 0, autoPass = 0, autoTotal = 0, manualDone = 0, manualTotal = 0;
  const categories = checklist.categories.map((cat) => {
    const items = cat.items.map((it) => {
      let status, detail;
      if (it.type === "auto") {
        const a = audit[it.check];
        status = a ? (a.pass ? "done" : "todo") : "todo";
        detail = a ? a.detail : "검사 항목 미구현";
        autoTotal++;
        if (a && a.pass) autoPass++;
      } else {
        status = it.status || "todo"; // todo/done/na
        detail = it.howto || it.note || "";
        if (status !== "na") { manualTotal++; if (status === "done") manualDone++; }
      }
      if (status !== "na") { total++; if (status === "done") done++; }
      return { item: it.item, note: it.note, type: it.type, status, detail };
    });
    const catTotal = items.filter((i) => i.status !== "na").length;
    const catDone = items.filter((i) => i.status === "done").length;
    return { name: cat.name, items, catTotal, catDone };
  });

  // 발행 현황
  const byCat = {};
  const byMonth = {};
  let bloggerPublished = 0;
  for (const p of posts) {
    byCat[p.category] = (byCat[p.category] || 0) + 1;
    const ym = (p.date || "").slice(0, 7);
    byMonth[ym] = (byMonth[ym] || 0) + 1;
    if (p.published?.blogger) bloggerPublished++;
  }

  // 내 의견·요청 + 발행 예정(플랜)
  const myNotes = editorialNotes();
  const myTopics = listTopicsForDashboard();
  const userPending = myTopics
    .filter((t) => t.status === "pending")
    .map((t) => ({ title: t.title, category: t.category, source: "운영자 요청", note: t.note }));
  // 시즌성 미리보기(아직 발행 안 된 주제 순서)
  const seasonalPreview = pickTopics(8).map((t) => ({
    title: t.title, category: t.category, keywords: t.keywords || [], source: "시즌 자동",
  }));
  const perRun = site.publishing.postsPerRun || 1;
  // 발행 예정: 운영자 요청 먼저, 그다음 시즌
  // 발행 스케줄: 매일 runsPerDay회 cron, 1회 perRun편 → 예정일 산정
  const runsPerDay = site.publishing.runsPerDay || 1;
  const postsPerDay = perRun * runsPerDay;
  const times = site.publishing.publishTimes || [];
  const base = nowKST();
  const plan = [...userPending, ...seasonalPreview].slice(0, 12).map((t, i) => {
    const dayOffset = Math.floor(i / postsPerDay); // 0 = 오늘 남은 회차 기준
    const slotInDay = i % postsPerDay;
    const dt = new Date(base.getTime() + (dayOffset + 1) * 86400000);
    const time = times[slotInDay % (times.length || 1)] || "";
    return {
      ...t,
      when: i < perRun ? "다음 발행" : "예정",
      date: dt.toISOString().slice(0, 10) + (time ? ` ${time}` : ""),
      keywords: t.keywords || [],
    };
  });

  const gh = site.github || {};
  const editUrl = `https://github.com/${gh.repo}/edit/${gh.branch}/config/requests.json`;
  const setupUrl = `https://github.com/${gh.repo}/blob/${gh.branch}/docs/SETUP.md`;

  // ---- 채널별 데이터 ----
  const env = process.env;
  const hasVal = (v) => !!(v && !String(v).includes("XXXX"));
  const mapPost = (p) => ({
    title: p.title, date: p.date, category: p.category, path: p.path,
    slug: p.slug, blogger: !!p.published?.blogger,
  });
  const sitePosts = posts.filter((p) => p.channels?.site !== false);
  const bloggerPosts = posts.filter((p) => p.channels?.blogger);
  const bloggerPub = bloggerPosts.filter((p) => p.published?.blogger).length;
  const wpPosts = posts.filter((p) => p.channels?.wordpress);
  const wpPub = wpPosts.filter((p) => p.published?.wordpress).length;
  const wpSecrets = [
    { k: "WORDPRESS_URL", ok: !!env.WORDPRESS_URL },
    { k: "WORDPRESS_USER", ok: !!env.WORDPRESS_USER },
    { k: "WORDPRESS_APP_PASSWORD", ok: !!env.WORDPRESS_APP_PASSWORD },
  ];
  const wpConfigured = wpSecrets.every((s) => s.ok);
  const bloggerSecrets = [
    { k: "BLOGGER_BLOG_ID", ok: !!env.BLOGGER_BLOG_ID },
    { k: "BLOGGER_CLIENT_ID", ok: !!env.BLOGGER_CLIENT_ID },
    { k: "BLOGGER_CLIENT_SECRET", ok: !!env.BLOGGER_CLIENT_SECRET },
    { k: "BLOGGER_REFRESH_TOKEN", ok: !!env.BLOGGER_REFRESH_TOKEN },
  ];
  const bloggerConfigured = bloggerSecrets.every((s) => s.ok);
  const siteSettings = [
    { k: "배포 (GitHub Pages)", ok: true, v: site.url },
    { k: "Google AdSense", ok: hasVal(site.ads.adsense.client), v: hasVal(site.ads.adsense.client) ? site.ads.adsense.client : "미설정" },
    { k: "Taboola", ok: !!site.ads.taboola.publisher, v: site.ads.taboola.publisher || "미설정" },
    { k: "Google Analytics 4", ok: !!site.analytics.ga4, v: site.analytics.ga4 || "미설정" },
    { k: "Search Console 인증", ok: !!site.analytics.googleSiteVerification, v: site.analytics.googleSiteVerification ? "설정됨" : "미설정" },
    { k: "IndexNow", ok: !!site.indexNowKey, v: site.indexNowKey ? "활성화" : "미설정" },
  ];
  const channels = {
    site: {
      label: "자체 사이트", icon: "🌐", enabled: true, count: sitePosts.length,
      url: site.url, settings: siteSettings, posts: sitePosts.map(mapPost),
    },
    blogger: {
      label: "구글 블로거", icon: "📝", enabled: site.channels.blogger.enabled,
      configured: bloggerConfigured, published: bloggerPub,
      pending: bloggerPosts.length - bloggerPub, secrets: bloggerSecrets,
      posts: bloggerPosts.map(mapPost), setupUrl,
    },
    naver: {
      label: "네이버 블로그", icon: "🟢",
      enabled: !!(site.channels.naver && site.channels.naver.enabled), count: 0,
    },
    wordpress: {
      label: "워드프레스", icon: "🔵", enabled: site.channels.wordpress.enabled,
      configured: wpConfigured, published: wpPub, pending: wpPosts.length - wpPub,
      secrets: wpSecrets, posts: wpPosts.map(mapPost), setupUrl,
    },
  };
  const activeChannels = [channels.site.enabled, channels.blogger.enabled, channels.naver.enabled, channels.wordpress.enabled].filter(Boolean).length;

  return {
    generatedAt: todayKST(),
    editUrl,
    setupUrl,
    channels,
    activeChannels,
    progress: {
      total, done, pct: total ? Math.round((done / total) * 100) : 0,
      autoPass, autoTotal, manualDone, manualTotal,
    },
    plan,
    requests: { notes: myNotes, topics: myTopics, pendingCount: userPending.length, baseline: site.editorialBaseline || [] },
    perRun,
    categories,
    publishing: {
      totalPosts: posts.length,
      sitePublished: posts.length, // 빌드되면 사이트 발행 간주
      bloggerEnabled: site.channels.blogger.enabled,
      bloggerPublished,
      byCat, byMonth,
      recent: posts.slice(0, 12).map((p) => ({
        title: p.title, date: p.date, category: p.category,
        path: p.path, blogger: !!p.published?.blogger,
      })),
    },
  };
}

// ---- HTML 렌더 ----
const STYLE = `
:root{--bg:#0f172a;--card:#1e293b;--fg:#e2e8f0;--mut:#94a3b8;--ok:#22c55e;--no:#f43f5e;--na:#475569;--ac:#38bdf8;--line:#334155}
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,"Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;background:var(--bg);color:var(--fg);line-height:1.6}
.wrap{max-width:1080px;margin:0 auto;padding:24px 18px 80px}
h1{font-size:24px;margin:0 0 4px}.sub{color:var(--mut);font-size:14px;margin-bottom:24px}
.grid{display:grid;gap:16px}.cols{grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px}
.kpi{font-size:30px;font-weight:800}.kpi small{font-size:13px;color:var(--mut);font-weight:500}
.label{color:var(--mut);font-size:13px;margin-bottom:6px}
.bar{height:12px;background:#0b1220;border-radius:999px;overflow:hidden;margin-top:10px}
.bar>span{display:block;height:100%;background:linear-gradient(90deg,#22c55e,#38bdf8)}
section{margin-top:30px}section h2{font-size:18px;border-bottom:1px solid var(--line);padding-bottom:8px}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line)}
th{color:var(--mut);font-weight:600}
.badge{display:inline-block;font-size:12px;padding:2px 9px;border-radius:999px}
.b-done{background:rgba(34,197,94,.15);color:#4ade80}.b-todo{background:rgba(244,63,94,.15);color:#fb7185}
.b-na{background:rgba(71,85,105,.25);color:#94a3b8}.b-auto{background:rgba(56,189,248,.15);color:#7dd3fc}
.b-manual{background:rgba(168,85,247,.15);color:#c4b5fd}
details{background:var(--card);border:1px solid var(--line);border-radius:12px;margin:10px 0;padding:4px 14px}
summary{cursor:pointer;padding:10px 0;font-weight:600;display:flex;justify-content:space-between;align-items:center;gap:10px}
summary::-webkit-details-marker{display:none}
.mini{font-size:12px;color:var(--mut)}
.row{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--line)}
.row:last-child{border:0}.row .d{color:var(--mut);font-size:12px}
a{color:var(--ac)}
.chl{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.chl span{font-size:12px;background:#0b1220;border:1px solid var(--line);border-radius:8px;padding:4px 10px}
.tabs{display:flex;gap:4px;flex-wrap:wrap;border-bottom:1px solid var(--line);margin:18px 0 8px;position:sticky;top:0;background:var(--bg);z-index:5}
.tabs button{background:transparent;border:0;color:var(--mut);font-size:15px;font-weight:700;padding:12px 16px;cursor:pointer;border-bottom:2px solid transparent;font-family:inherit}
.tabs button:hover{color:var(--fg)}
.tabs button.active{color:#fff;border-bottom-color:var(--ac)}
.panel{display:none}.panel.active{display:block}
.set{display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid var(--line);align-items:center}
.set:last-child{border:0}.set .v{color:var(--mut);font-size:13px;word-break:break-all}
.dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:9px;vertical-align:middle}
.dot.on{background:var(--ok)}.dot.off{background:var(--no)}
.linkrow{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;font-size:14px}
.linkrow a{background:#0b1220;border:1px solid var(--line);border-radius:8px;padding:7px 12px;text-decoration:none}
.chcard{cursor:pointer;transition:border-color .15s}.chcard:hover{border-color:var(--ac)}
.note{background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.25);border-radius:10px;padding:12px 14px;font-size:14px;margin-top:12px}
`;

function bars(obj, nameFn) {
  const max = Math.max(1, ...Object.values(obj));
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) =>
      `<div class="row"><span>${esc(nameFn ? nameFn(k) : k)}</span><span>${v}편</span></div>
       <div class="bar"><span style="width:${Math.round((v / max) * 100)}%"></span></div>`
    ).join("");
}

// 글 목록 테이블 행 (원고 다운로드 포함)
function postRows(posts, showBlogger) {
  const cols = 3 + (showBlogger ? 1 : 0) + 1;
  if (!posts.length) return `<tr><td colspan="${cols}" class="mini">발행 글 없음</td></tr>`;
  return posts.map((r) =>
    `<tr><td><a href="${esc(site.url + r.path)}" target="_blank">${esc(r.title)}</a></td>
      <td>${esc(catName(r.category))}</td><td>${esc(r.date)}</td>
      ${showBlogger ? `<td><span class="badge ${r.blogger ? "b-done" : "b-todo"}">${r.blogger ? "발행" : "대기"}</span></td>` : ""}
      <td><a href="drafts/${esc(r.slug)}.md" download>원고 ⬇</a></td></tr>`
  ).join("");
}
// 발행 스케줄(예정) 표 — 예정일 + 기획 브리프
function scheduleTable(plan) {
  if (!plan.length) return `<div class="mini">예정된 주제가 없습니다.</div>`;
  return `<table><thead><tr><th>예정일</th><th>제목</th><th>카테고리</th><th>핵심 키워드</th><th>구분</th></tr></thead><tbody>` +
    plan.map((t) =>
      `<tr><td>${esc(t.date)}</td><td>${esc(t.title)}</td><td>${esc(catName(t.category))}</td>
        <td class="d">${esc((t.keywords || []).join(", "))}</td>
        <td><span class="badge ${t.source === "운영자 요청" ? "b-manual" : "b-auto"}">${esc(t.source)}</span></td></tr>`
    ).join("") + `</tbody></table>`;
}
// 설정/상태 목록
function setRows(arr) {
  return arr.map((s) =>
    `<div class="set"><div><span class="dot ${s.ok ? "on" : "off"}"></span>${esc(s.k)}</div>
      <div class="v">${esc(s.v || (s.ok ? "설정됨" : "미설정"))}</div></div>`
  ).join("");
}

function render(d) {
  const p = d.progress;
  const ch = d.channels;
  // 발행 스케줄 섹션(다운로드 포함) — 채널 공통
  const planDownloads = `<div class="linkrow">
    <a href="plan.md" download>📥 기획안 (.md)</a>
    <a href="plan.csv" download>📥 스케줄 (.csv)</a></div>`;
  const scheduleSection = (extra = "") => `
<section><h2>🗓 발행 스케줄 (예정)</h2>
  <div class="sub">매일 09:00·18:00(KST) 자동 발행 기준 예상 일정입니다(하루 2편). 운영자 요청이 시즌 주제보다 먼저 처리됩니다.</div>
  <div class="card">${scheduleTable(d.plan)}</div>
  ${planDownloads}${extra}</section>`;
  const catCards = d.categories.map((c) => {
    const pct = c.catTotal ? Math.round((c.catDone / c.catTotal) * 100) : 100;
    const rows = c.items.map((it) => {
      const b = it.status === "done" ? "b-done" : it.status === "na" ? "b-na" : "b-todo";
      const st = it.status === "done" ? "완료" : it.status === "na" ? "해당없음" : "필요";
      const tb = it.type === "auto" ? "b-auto" : "b-manual";
      const tl = it.type === "auto" ? "자동" : "수동";
      return `<div class="row"><div><div>${esc(it.item)} <span class="badge ${tb}">${tl}</span></div>
        <div class="d">${esc(it.detail || it.note || "")}</div></div>
        <div><span class="badge ${b}">${st}</span></div></div>`;
    }).join("");
    return `<details><summary>${esc(c.name)}
      <span class="mini">${c.catDone}/${c.catTotal} (${pct}%)</span></summary>${rows}</details>`;
  }).join("");

  // ===== 탭1: 전체 =====
  const overview = `
<div class="grid cols">
  <div class="card"><div class="label">SEO·GEO 진척도</div>
    <div class="kpi">${p.pct}%<small> ${p.done}/${p.total}</small></div>
    <div class="bar"><span style="width:${p.pct}%"></span></div></div>
  <div class="card"><div class="label">자동 검사 통과</div>
    <div class="kpi">${p.autoPass}<small>/${p.autoTotal}</small></div>
    <div class="bar"><span style="width:${p.autoTotal ? Math.round(p.autoPass/p.autoTotal*100):0}%"></span></div></div>
  <div class="card"><div class="label">총 발행 글</div>
    <div class="kpi">${d.publishing.totalPosts}<small> 편</small></div></div>
  <div class="card"><div class="label">활성 채널</div>
    <div class="kpi">${d.activeChannels}<small> / 4</small></div></div>
</div>

<section><h2>📡 채널별 현황</h2>
  <div class="grid cols">
    <div class="card chcard" onclick="showTab('site')">
      <div class="label">${ch.site.icon} ${ch.site.label}</div>
      <div class="kpi" style="font-size:24px">${ch.site.count}<small> 편 발행</small></div>
      <div class="chl"><span>상태: 운영중</span></div></div>
    <div class="card chcard" onclick="showTab('blogger')">
      <div class="label">${ch.blogger.icon} ${ch.blogger.label}</div>
      <div class="kpi" style="font-size:24px">${ch.blogger.published}<small> 발행 / ${ch.blogger.pending} 대기</small></div>
      <div class="chl"><span>${ch.blogger.configured ? "연동됨" : "연동 필요"}</span></div></div>
    <div class="card chcard" onclick="showTab('wordpress')">
      <div class="label">${ch.wordpress.icon} ${ch.wordpress.label}</div>
      <div class="kpi" style="font-size:24px">${ch.wordpress.published}<small> 발행 / ${ch.wordpress.pending} 대기</small></div>
      <div class="chl"><span>${ch.wordpress.configured ? "연동됨" : "연동 필요"}</span></div></div>
    <div class="card chcard muted-card" onclick="showTab('naver')">
      <div class="label">${ch.naver.icon} ${ch.naver.label}</div>
      <div class="kpi" style="font-size:24px">—</div>
      <div class="chl"><span>현재 제외</span></div></div>
  </div></section>

<section><h2>🗓 발행 예정 (플랜 검토)</h2>
  <div class="sub">다음에 자동 발행될 순서입니다. 운영자 요청이 시즌 주제보다 먼저 처리됩니다. 매일 09:00·18:00(KST) 각 ${d.perRun}편(하루 ${d.perRun * (site.publishing.runsPerDay || 1)}편).</div>
  <div class="card"><table><thead><tr><th>#</th><th>제목</th><th>카테고리</th><th>구분</th><th>시점</th></tr></thead><tbody>
  ${d.plan.length ? d.plan.map((t, i) => `<tr>
      <td>${i + 1}</td><td>${esc(t.title)}</td><td>${esc(catName(t.category))}</td>
      <td><span class="badge ${t.source === "운영자 요청" ? "b-manual" : "b-auto"}">${esc(t.source)}</span></td>
      <td><span class="badge ${t.when === "다음 발행" ? "b-done" : "b-na"}">${esc(t.when)}</span></td></tr>`).join("")
    : `<tr><td colspan="5" class="mini">예정된 주제가 없습니다.</td></tr>`}
  </tbody></table></div></section>

<section><h2>📝 내 의견 · 요청 (편집 지시)</h2>
  <div class="sub"><code>config/requests.json</code> 에서 관리 ·
    <a href="${esc(d.editUrl)}" target="_blank">✏️ 깃허브에서 바로 편집</a> → 저장하면 다음 발행부터 반영됩니다.</div>
  <div class="card">
    <div class="label">📌 고정 작성 기준 (모든 글 항상 적용 · 코드 내장)</div>
    <ol style="margin:6px 0 18px;padding-left:20px">
      ${(d.requests.baseline || []).map((r) => `<li style="margin:4px 0">${esc(r)}</li>`).join("")}
    </ol>
    <div class="label">공통 편집 지침 (운영자 수정 가능)</div>
    <div style="margin:6px 0 16px">${d.requests.notes ? esc(d.requests.notes) : "<span class=mini>아직 없음 — requests.json 의 notes 에 적어주세요. 예: '존댓말, 정부 공식 출처 필수, 표 적극 활용'</span>"}</div>
    <div class="label">요청 주제 (${d.requests.pendingCount}건 대기)</div>
    <table style="margin-top:6px"><thead><tr><th>제목</th><th>카테고리</th><th>상태</th><th>메모</th></tr></thead><tbody>
    ${d.requests.topics.length ? d.requests.topics.map((t) => `<tr>
        <td>${esc(t.title)}</td><td>${esc(catName(t.category))}</td>
        <td><span class="badge ${t.status === "done" ? "b-done" : t.status === "pending" ? "b-manual" : "b-na"}">${t.status === "done" ? "발행됨" : t.status === "pending" ? "대기" : esc(t.status)}</span></td>
        <td class="d">${esc(t.note || "")}</td></tr>`).join("")
      : `<tr><td colspan="4" class="mini">등록된 요청이 없습니다.</td></tr>`}
    </tbody></table>
  </div></section>

<section><h2>📅 월별 발행 추이</h2>
  <div class="card">${Object.keys(d.publishing.byMonth).length ? bars(d.publishing.byMonth) : "<div class=mini>데이터 없음</div>"}</div></section>`;

  // ===== 탭2: 자체 사이트 =====
  const siteTab = `
<section><h2>🌐 자체 사이트 상태</h2>
  <div class="grid cols">
    <div class="card"><div class="label">발행 글</div><div class="kpi">${ch.site.count}<small> 편</small></div></div>
    <div class="card"><div class="label">배포</div><div class="kpi" style="font-size:22px">GitHub Pages</div>
      <div class="chl"><span>운영중</span></div></div>
    <div class="card"><div class="label">SEO·GEO 자동검사</div><div class="kpi">${p.autoPass}<small>/${p.autoTotal}</small></div></div>
  </div>
  <div class="linkrow">
    <a href="${esc(ch.site.url)}/" target="_blank">사이트 열기</a>
    <a href="${esc(ch.site.url)}/sitemap.xml" target="_blank">sitemap.xml</a>
    <a href="${esc(ch.site.url)}/robots.txt" target="_blank">robots.txt</a>
    <a href="${esc(ch.site.url)}/llms.txt" target="_blank">llms.txt</a>
    <a href="${esc(ch.site.url)}/rss.xml" target="_blank">RSS</a>
  </div></section>

${scheduleSection()}

<section><h2>⚙️ 수익화·분석 설정</h2>
  <div class="card">${setRows(ch.site.settings)}</div>
  <div class="note">미설정 항목은 GitHub <b>Settings → Secrets and variables → Actions → Variables</b> 에 등록하면 자동 반영됩니다. 자세한 절차는 <a href="${esc(d.setupUrl)}" target="_blank">SETUP 가이드</a> 참고.</div></section>

<section><h2>🗂 카테고리별 발행</h2>
  <div class="card">${Object.keys(d.publishing.byCat).length ? bars(d.publishing.byCat, catName) : "<div class=mini>아직 발행된 글이 없습니다.</div>"}</div></section>

<section><h2>✅ SEO · GEO 체크리스트</h2>
  <div class="sub">자동 항목은 빌드 결과물을 실시간 검사한 결과(현재 ${p.autoPass}/${p.autoTotal}). 수동 항목은 <code>config/geo-checklist.json</code> 의 status 로 관리합니다.</div>
  ${catCards}</section>

<section><h2>📰 사이트 발행 글 (${ch.site.count})</h2>
  <div class="card"><table><thead><tr><th>제목</th><th>카테고리</th><th>게시일</th><th>원고</th></tr></thead><tbody>
  ${postRows(ch.site.posts, false)}</tbody></table></div></section>`;

  // ===== 탭3: 구글 블로거 =====
  const bloggerTab = `
<section><h2>📝 구글 블로거 상태</h2>
  <div class="grid cols">
    <div class="card"><div class="label">연동 상태</div>
      <div class="kpi" style="font-size:22px">${ch.blogger.configured ? "연동됨" : "연동 필요"}</div></div>
    <div class="card"><div class="label">발행됨</div><div class="kpi">${ch.blogger.published}<small> 편</small></div></div>
    <div class="card"><div class="label">발행 대기</div><div class="kpi">${ch.blogger.pending}<small> 편</small></div></div>
  </div>
  ${ch.blogger.configured ? "" : `<div class="note">아직 연동되지 않았습니다. 아래 4개 Secret 을 등록하고 워크플로우 입력 <code>publish_blogger=true</code>(또는 변수 <code>PUBLISH_BLOGGER=true</code>) 로 두면 자동 발행됩니다. 발급 절차: <a href="${esc(d.setupUrl)}" target="_blank">SETUP STEP 7</a>.</div>`}</section>

${scheduleSection()}

<section><h2>🔑 연동 설정 (Secrets)</h2>
  <div class="card">${setRows(ch.blogger.secrets.map((s) => ({ k: s.k, ok: s.ok, v: s.ok ? "등록됨" : "미등록" })))}</div></section>

<section><h2>📰 블로거 발행 대상 글 (${ch.blogger.posts.length})</h2>
  <div class="card"><table><thead><tr><th>제목</th><th>카테고리</th><th>게시일</th><th>블로거</th><th>원고</th></tr></thead><tbody>
  ${postRows(ch.blogger.posts, true)}</tbody></table></div></section>`;

  // ===== 탭: 워드프레스 =====
  const wpTab = `
<section><h2>🔵 워드프레스 상태</h2>
  <div class="grid cols">
    <div class="card"><div class="label">연동 상태</div>
      <div class="kpi" style="font-size:22px">${ch.wordpress.configured ? "연동됨" : "연동 필요"}</div></div>
    <div class="card"><div class="label">발행됨</div><div class="kpi">${ch.wordpress.published}<small> 편</small></div></div>
    <div class="card"><div class="label">발행 대기</div><div class="kpi">${ch.wordpress.pending}<small> 편</small></div></div>
  </div>
  ${ch.wordpress.configured ? "" : `<div class="note">아직 연동되지 않았습니다. 아래 항목(변수/시크릿)을 등록하면 자동 발행됩니다: <code>WORDPRESS_URL</code>·<code>WORDPRESS_USER</code>(Variables), <code>WORDPRESS_APP_PASSWORD</code>(Secret). 워드프레스 → 사용자 → 프로필 → <b>애플리케이션 비밀번호</b>에서 발급. 절차: <a href="${esc(d.setupUrl)}" target="_blank">SETUP 가이드</a>.</div>`}</section>

${scheduleSection()}

<section><h2>🔑 연동 설정</h2>
  <div class="card">${setRows(ch.wordpress.secrets.map((s) => ({ k: s.k, ok: s.ok, v: s.ok ? "등록됨" : "미등록" })))}</div>
  <div class="note">💡 워드프레스는 <b>호스팅</b>이 필요합니다(워드프레스닷컴 비즈니스 이상 또는 자체 호스팅). REST API + 애플리케이션 비밀번호만 있으면 자체 사이트와 동일 글이 자동 발행됩니다.</div></section>

<section><h2>📰 워드프레스 발행 대상 글 (${ch.wordpress.posts.length})</h2>
  <div class="card"><table><thead><tr><th>제목</th><th>카테고리</th><th>게시일</th><th>WP</th><th>원고</th></tr></thead><tbody>
  ${ch.wordpress.posts.length ? ch.wordpress.posts.map((r) =>
    `<tr><td><a href="${esc(site.url + r.path)}" target="_blank">${esc(r.title)}</a></td>
      <td>${esc(catName(r.category))}</td><td>${esc(r.date)}</td>
      <td><span class="badge b-todo">대기</span></td>
      <td><a href="drafts/${esc(r.slug)}.md" download>원고 ⬇</a></td></tr>`).join("")
    : `<tr><td colspan="5" class="mini">연동 후 발행 대상 글이 여기에 표시됩니다. (신규 생성 글부터 WP 채널로 지정됨)</td></tr>`}
  </tbody></table></div></section>`;

  // ===== 탭4: 네이버 블로그 =====
  const naverTab = `
<section><h2>🟢 네이버 블로그</h2>
  <div class="card">
    <div class="set"><div><span class="dot off"></span>자동 발행 상태</div><div class="v">현재 제외</div></div>
    <div class="set"><div>사유</div><div class="v">네이버는 개인 블로그 글쓰기 공식 API가 없음</div></div>
  </div>
  <div class="note">
    <b>대안 옵션</b><br>
    1) <b>반자동</b>: 사이트/블로거용으로 생성된 글을 복사해 네이버 에디터에 붙여넣기(현재 권장).<br>
    2) <b>비공식 자동화</b>(Selenium 등): 네이버 이용약관 위반·계정 차단 위험이 있어 미적용.<br>
    추후 네이버 공식 채널/연동 정책이 열리면 이 채널을 활성화할 수 있도록 구조가 준비돼 있습니다.
  </div></section>

<section><h2>📥 기획안 · 원고 다운로드 (네이버 수동 발행용)</h2>
  <div class="sub">네이버는 직접 발행해야 하므로, 아래 파일을 받아 네이버 에디터에 붙여넣으세요.</div>
  <div class="linkrow">
    <a href="naver-content-pack.md" download>📦 통합 기획안+전체 원고 (.md)</a>
    <a href="plan.md" download>📥 기획안 (.md)</a>
    <a href="plan.csv" download>📥 스케줄 (.csv)</a>
  </div>
  <div class="note">💡 <b>통합 팩</b>에는 발행 스케줄과 현재까지 작성된 모든 글의 원고가 한 파일에 담겨 있어, 복사·붙여넣기만으로 네이버에 발행할 수 있습니다.</div>
</section>

${scheduleSection()}

<section><h2>📝 원고 다운로드 (글별)</h2>
  <div class="card"><table><thead><tr><th>제목</th><th>카테고리</th><th>게시일</th><th>원고</th></tr></thead><tbody>
  ${postRows(ch.site.posts, false)}</tbody></table></div></section>

<section><h2>🔗 네이버 노출 보조 (적용됨)</h2>
  <div class="card">
    <div class="set"><div><span class="dot ${site.analytics.naverWebmaster ? "on" : "off"}"></span>네이버 서치어드바이저 소유확인</div>
      <div class="v">${site.analytics.naverWebmaster ? "설정됨" : "미설정 (NAVER_SITE_VERIFICATION)"}</div></div>
    <div class="set"><div><span class="dot on"></span>RSS 피드 제공</div><div class="v">/rss.xml</div></div>
  </div>
  <div class="note">자체 사이트 글을 네이버 검색에 노출시키려면 <a href="https://searchadvisor.naver.com" target="_blank">네이버 서치어드바이저</a>에 사이트를 등록하고 사이트맵을 제출하세요.</div></section>`;

  return `<!doctype html><html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(site.name)} · 운영 대시보드</title>
<style>${STYLE}</style></head><body><div class="wrap">
<h1>📊 운영 대시보드</h1>
<div class="sub">${esc(site.name)} — 채널별 발행·관리 모니터링 · 생성 ${d.generatedAt} (비공개 페이지)</div>

<div class="tabs">
  <button data-tab="all" onclick="showTab('all',this)">📊 전체</button>
  <button data-tab="site" onclick="showTab('site',this)">🌐 자체 사이트</button>
  <button data-tab="blogger" onclick="showTab('blogger',this)">📝 구글 블로거</button>
  <button data-tab="wordpress" onclick="showTab('wordpress',this)">🔵 워드프레스</button>
  <button data-tab="naver" onclick="showTab('naver',this)">🟢 네이버 블로그</button>
</div>

<div id="t-all" class="panel">${overview}</div>
<div id="t-site" class="panel">${siteTab}</div>
<div id="t-blogger" class="panel">${bloggerTab}</div>
<div id="t-wordpress" class="panel">${wpTab}</div>
<div id="t-naver" class="panel">${naverTab}</div>

<script>
function showTab(key, btn){
  document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('active')});
  document.querySelectorAll('.tabs button').forEach(function(b){b.classList.remove('active')});
  var el=document.getElementById('t-'+key); if(el) el.classList.add('active');
  if(!btn) btn=document.querySelector('.tabs button[data-tab="'+key+'"]');
  if(btn) btn.classList.add('active');
  if(history.replaceState) history.replaceState(null,'','#'+key);
}
document.addEventListener('DOMContentLoaded',function(){
  var h=(location.hash||'').replace('#','');
  showTab(document.querySelector('.tabs button[data-tab="'+h+'"]') ? h : 'all');
});
</script>
</div></body></html>`;
}

// 발행 스케줄/기획안 → 다운로드용 파일 생성
function writePlanFiles(dir, plan, generatedAt) {
  const rows = plan.map((t, i) =>
    `| ${i + 1} | ${t.date} | ${t.title} | ${catName(t.category)} | ${(t.keywords || []).join(", ")} | ${t.source} |`
  );
  const md = `# 발행 기획안 · 스케줄 — ${site.name}\n\n생성일: ${generatedAt} · 매일 09:00·18:00(KST) 자동 발행 기준 예상 일정(하루 2편)\n\n` +
    `| # | 예정일 | 제목 | 카테고리 | 핵심 키워드 | 구분 |\n|---|---|---|---|---|---|\n${rows.join("\n")}\n`;
  fs.writeFileSync(path.join(dir, "plan.md"), md, "utf8");

  const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const csv = "﻿" + ["순번,예정일,제목,카테고리,핵심키워드,구분"]
    .concat(plan.map((t, i) =>
      [i + 1, t.date, t.title, catName(t.category), (t.keywords || []).join(" "), t.source].map(esc).join(",")
    )).join("\n") + "\n";
  fs.writeFileSync(path.join(dir, "plan.csv"), csv, "utf8");
}

// 발행된 글의 원고(.md) — 수동 발행/검토/네이버용 복사
function writeDrafts(dir, posts) {
  const draftsDir = path.join(dir, "drafts");
  ensureDir(draftsDir);
  for (const p of posts) {
    const head = `# ${p.title}\n\n> ${p.description || ""}\n\n- 카테고리: ${catName(p.category)}\n- 게시일: ${p.date}\n- 키워드: ${(p.keywords || []).join(", ")}\n\n---\n\n`;
    fs.writeFileSync(path.join(draftsDir, `${p.slug}.md`), head + (p.body || "").trim() + "\n", "utf8");
  }
}

// 네이버용 통합 기획안 팩(스케줄 + 전체 원고를 한 파일로)
function writeNaverPack(dir, plan, posts) {
  let out = `# ${site.name} — 네이버 블로그용 기획안 & 원고 모음\n\n생성일: ${todayKST()}\n네이버는 자동 발행 API가 없어, 아래 원고를 복사해 네이버 에디터에 붙여넣어 발행하세요.\n\n`;
  out += `## 1) 발행 예정 스케줄\n\n| 예정일 | 제목 | 카테고리 | 구분 |\n|---|---|---|---|\n` +
    plan.map((t) => `| ${t.date} | ${t.title} | ${catName(t.category)} | ${t.source} |`).join("\n") + "\n\n";
  out += `## 2) 발행 완료 원고 (복사용)\n\n`;
  for (const p of posts) {
    out += `\n\n---\n\n### ${p.title}\n\n- 카테고리: ${catName(p.category)} · 게시일: ${p.date}\n- 키워드: ${(p.keywords || []).join(", ")}\n\n${(p.body || "").trim()}\n`;
  }
  fs.writeFileSync(path.join(dir, "naver-content-pack.md"), out, "utf8");
}

export function buildDashboard() {
  const data = collect();
  const dir = path.join(PUBLIC_DIR, "dashboard");
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, "index.html"), render(data), "utf8");
  fs.writeFileSync(path.join(dir, "data.json"), JSON.stringify(data, null, 2), "utf8");

  // 다운로드 산출물 (기획안·스케줄·원고)
  const posts = loadPosts();
  writePlanFiles(dir, data.plan, data.generatedAt);
  writeDrafts(dir, posts);
  writeNaverPack(dir, data.plan, posts);

  console.log(
    `[dashboard] 생성: /dashboard/ — 진척도 ${data.progress.pct}% ` +
    `(자동 ${data.progress.autoPass}/${data.progress.autoTotal}), 발행 ${data.publishing.totalPosts}편`
  );
  return data;
}

if (import.meta.url === `file://${process.argv[1]}`) buildDashboard();
