// =============================================================
//  구글 블로거(Blogger) 자동 발행
//  - content/posts 중 아직 블로거에 발행되지 않은 글을 발행
//  - 발행 후 frontmatter 의 published.blogger 를 true 로 갱신
//
//  인증(서비스가 아닌 사용자 OAuth 필요 — 블로거는 OAuth2):
//    BLOGGER_CLIENT_ID, BLOGGER_CLIENT_SECRET, BLOGGER_REFRESH_TOKEN
//    BLOGGER_BLOG_ID
//  refresh token 발급 방법은 README 의 "구글 블로거 연동" 참고.
// =============================================================
import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";
import { marked } from "marked";
import matter from "gray-matter";
import { site } from "../config/site.config.js";
import { POSTS_DIR, loadPosts } from "./lib.mjs";
import { absUrl } from "./render.mjs";

function getClient() {
  const { BLOGGER_CLIENT_ID, BLOGGER_CLIENT_SECRET, BLOGGER_REFRESH_TOKEN } = process.env;
  if (!BLOGGER_CLIENT_ID || !BLOGGER_CLIENT_SECRET || !BLOGGER_REFRESH_TOKEN) {
    throw new Error(
      "블로거 OAuth 환경변수(BLOGGER_CLIENT_ID/SECRET/REFRESH_TOKEN)가 필요합니다."
    );
  }
  const oauth2 = new google.auth.OAuth2(BLOGGER_CLIENT_ID, BLOGGER_CLIENT_SECRET);
  oauth2.setCredentials({ refresh_token: BLOGGER_REFRESH_TOKEN });
  return google.blogger({ version: "v3", auth: oauth2 });
}

/** 블로거용 본문 HTML 생성 (canonical 링크 + 간단 푸터 포함) */
function bloggerHtml(post) {
  const body = marked.parse(post.body);
  const faq =
    post.faqs && post.faqs.length
      ? `<h2>자주 묻는 질문</h2>` +
        post.faqs.map((f) => `<h3>${f.q}</h3><p>${f.a}</p>`).join("")
      : "";
  // 원문 링크: 검색엔진이 자체 사이트를 원본으로 인식하도록 유도(중복 콘텐츠 잠식 방지)
  const canonical = absUrl(post.path);
  return `${body}${faq}
<hr>
<p><small>※ 제도·요금·신청 기준은 변경될 수 있으니 공식 누리집을 확인하세요.<br>
이 글의 원문은 <a href="${canonical}">${site.name}</a>에 처음 게시되었습니다.</small></p>`;
}

async function publishOne(blogger, blogId, post) {
  const res = await blogger.posts.insert({
    blogId,
    isDraft: false,
    requestBody: {
      title: post.title,
      content: bloggerHtml(post),
      labels: [
        ...site.channels.blogger.defaultLabels,
        ...(post.tags || []).slice(0, 3),
      ],
    },
  });
  return res.data;
}

function markPublished(file) {
  const full = path.join(POSTS_DIR, file);
  const raw = fs.readFileSync(full, "utf8");
  const { data, content } = matter(raw);
  data.published = { ...(data.published || {}), blogger: true };
  fs.writeFileSync(full, matter.stringify(content, data), "utf8");
}

async function main() {
  const blogId = process.env.BLOGGER_BLOG_ID;
  if (!blogId) throw new Error("BLOGGER_BLOG_ID 가 필요합니다.");
  const blogger = getClient();

  const pending = loadPosts().filter(
    (p) => p.channels?.blogger && !p.published?.blogger
  );
  if (!pending.length) {
    console.log("[blogger] 발행할 신규 글이 없습니다.");
    return;
  }
  for (const post of pending) {
    console.log(`[blogger] 발행: ${post.title}`);
    const data = await publishOne(blogger, blogId, post);
    markPublished(post.file);
    console.log(`[blogger] 완료: ${data.url || data.id}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error("[blogger] 오류:", e.message);
    process.exit(1);
  });
}
