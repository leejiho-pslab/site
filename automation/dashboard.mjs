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
import { PUBLIC_DIR, ROOT, ensureDir, loadPosts, readJson, todayKST } from "./lib.mjs";
import { runAudit } from "./audit.mjs";

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

  return {
    generatedAt: todayKST(),
    progress: {
      total, done, pct: total ? Math.round((done / total) * 100) : 0,
      autoPass, autoTotal, manualDone, manualTotal,
    },
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

function render(d) {
  const p = d.progress;
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

  return `<!doctype html><html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(site.name)} · 발행/SEO·GEO 대시보드</title>
<style>${STYLE}</style></head><body><div class="wrap">
<h1>📊 운영 대시보드</h1>
<div class="sub">${esc(site.name)} — 발행 현황 및 SEO·GEO 체크리스트 진척도 · 생성 ${d.generatedAt} (비공개 페이지)</div>

<div class="grid cols">
  <div class="card"><div class="label">전체 진척도</div>
    <div class="kpi">${p.pct}%<small> ${p.done}/${p.total}</small></div>
    <div class="bar"><span style="width:${p.pct}%"></span></div></div>
  <div class="card"><div class="label">자동 검사 통과</div>
    <div class="kpi">${p.autoPass}<small>/${p.autoTotal} 자동항목</small></div>
    <div class="bar"><span style="width:${p.autoTotal ? Math.round(p.autoPass/p.autoTotal*100):0}%"></span></div></div>
  <div class="card"><div class="label">수동 항목 완료</div>
    <div class="kpi">${p.manualDone}<small>/${p.manualTotal} 수동항목</small></div></div>
  <div class="card"><div class="label">총 발행 글</div>
    <div class="kpi">${d.publishing.totalPosts}<small> 편</small></div>
    <div class="chl"><span>사이트 ${d.publishing.sitePublished}</span>
      <span>블로거 ${d.publishing.bloggerEnabled ? d.publishing.bloggerPublished : "비활성"}</span></div></div>
</div>

<section><h2>🗂 카테고리별 발행</h2>
  <div class="card">${Object.keys(d.publishing.byCat).length ? bars(d.publishing.byCat, catName) : "<div class=mini>아직 발행된 글이 없습니다.</div>"}</div></section>

<section><h2>📅 월별 발행 추이</h2>
  <div class="card">${Object.keys(d.publishing.byMonth).length ? bars(d.publishing.byMonth) : "<div class=mini>데이터 없음</div>"}</div></section>

<section><h2>📰 최근 발행 글</h2>
  <div class="card"><table><thead><tr><th>제목</th><th>카테고리</th><th>게시일</th><th>블로거</th></tr></thead><tbody>
  ${d.publishing.recent.map((r) => `<tr><td><a href="${esc(site.url + r.path)}">${esc(r.title)}</a></td>
    <td>${esc(catName(r.category))}</td><td>${esc(r.date)}</td>
    <td><span class="badge ${r.blogger ? "b-done" : "b-todo"}">${r.blogger ? "발행" : "대기"}</span></td></tr>`).join("")
    || `<tr><td colspan="4" class="mini">발행 글 없음</td></tr>`}
  </tbody></table></div></section>

<section><h2>✅ SEO · GEO 체크리스트</h2>
  <div class="sub">자동 항목은 빌드 결과물을 실시간 검사한 결과입니다. 수동 항목은 config/geo-checklist.json 의 status 를 수정해 관리하세요.</div>
  ${catCards}</section>

</div></body></html>`;
}

export function buildDashboard() {
  const data = collect();
  const dir = path.join(PUBLIC_DIR, "dashboard");
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, "index.html"), render(data), "utf8");
  fs.writeFileSync(path.join(dir, "data.json"), JSON.stringify(data, null, 2), "utf8");
  console.log(
    `[dashboard] 생성: /dashboard/ — 진척도 ${data.progress.pct}% ` +
    `(자동 ${data.progress.autoPass}/${data.progress.autoTotal}), 발행 ${data.publishing.totalPosts}편`
  );
  return data;
}

if (import.meta.url === `file://${process.argv[1]}`) buildDashboard();
