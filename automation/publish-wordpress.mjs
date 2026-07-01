// =============================================================
//  워드프레스(WordPress) 자동 발행 — REST API
//  - content/posts 중 아직 WP에 발행되지 않은 글을 발행
//  - 발행 후 frontmatter 의 published.wordpress 를 true 로 갱신
//
//  인증(애플리케이션 비밀번호 방식, Basic Auth):
//    WORDPRESS_URL           예: https://myblog.com  (워드프레스닷컴이면 https://xxx.wordpress.com)
//    WORDPRESS_USER          워드프레스 로그인 사용자명
//    WORDPRESS_APP_PASSWORD  사용자 > 프로필 > 애플리케이션 비밀번호에서 발급 (공백 포함 가능)
//    WORDPRESS_STATUS        publish(기본) | draft
//  발급 방법은 docs/SETUP.md 의 "워드프레스 연동" 참고.
// =============================================================
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";
import matter from "gray-matter";
import { site } from "../config/site.config.js";
import { POSTS_DIR, loadPosts } from "./lib.mjs";

function auth() {
  const { WORDPRESS_URL, WORDPRESS_USER, WORDPRESS_APP_PASSWORD } = process.env;
  if (!WORDPRESS_URL || !WORDPRESS_USER || !WORDPRESS_APP_PASSWORD) {
    throw new Error("WORDPRESS_URL / WORDPRESS_USER / WORDPRESS_APP_PASSWORD 가 필요합니다.");
  }
  const base = WORDPRESS_URL.replace(/\/+$/, "");
  const token = Buffer.from(
    `${WORDPRESS_USER}:${WORDPRESS_APP_PASSWORD.replace(/\s+/g, "")}`
  ).toString("base64");
  return { base, token };
}

/** WP 본문 HTML (canonical 안내 + 출처 고지 포함) */
function wpHtml(post) {
  const body = marked.parse(post.body);
  const faq =
    post.faqs && post.faqs.length
      ? `<h2>자주 묻는 질문</h2>` + post.faqs.map((f) => `<h3>${f.q}</h3><p>${f.a}</p>`).join("")
      : "";
  return `${body}${faq}
<hr>
<p><small>※ 제도·요금·신청 기준은 변경될 수 있으니 공식 누리집을 확인하세요.</small></p>`;
}

async function publishOne({ base, token }, post) {
  const res = await fetch(`${base}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: post.title,
      content: wpHtml(post),
      status: site.channels.wordpress.status || "publish",
      excerpt: post.description || "",
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`WP ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

function markPublished(file) {
  const full = path.join(POSTS_DIR, file);
  const raw = fs.readFileSync(full, "utf8");
  const { data, content } = matter(raw);
  data.published = { ...(data.published || {}), wordpress: true };
  fs.writeFileSync(full, matter.stringify(content, data), "utf8");
}

async function main() {
  const client = auth();
  const pending = loadPosts().filter(
    (p) => p.channels?.wordpress && !p.published?.wordpress
  );
  if (!pending.length) {
    console.log("[wordpress] 발행할 신규 글이 없습니다.");
    return;
  }
  for (const post of pending) {
    console.log(`[wordpress] 발행: ${post.title}`);
    const data = await publishOne(client, post);
    markPublished(post.file);
    console.log(`[wordpress] 완료: ${data.link || data.id}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error("[wordpress] 오류:", e.message);
    process.exit(1);
  });
}
