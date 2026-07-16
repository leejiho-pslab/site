// =============================================================
//  공통 유틸 (파일 IO, slug, 날짜, frontmatter 읽기)
// =============================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

export const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");
export const POSTS_DIR = path.join(ROOT, "content", "posts");
export const PUBLIC_DIR = path.join(ROOT, "public");

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

/** 한국시간(KST) 기준 현재 시각 */
export function nowKST() {
  const now = new Date();
  // UTC+9
  return new Date(now.getTime() + 9 * 60 * 60 * 1000);
}

/** YYYY-MM-DD (KST) */
export function todayKST() {
  return nowKST().toISOString().slice(0, 10);
}

/** 한글 제목 -> URL slug. 한글은 유지하되 공백/특수문자 정리 */
export function slugify(title) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^가-힣a-z0-9\s-]/g, "") // 한글/영문/숫자/공백/하이픈만
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/** 본문에서 발췌(excerpt) 추출 */
export function excerpt(markdown, len = 110) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#>*_`\-\[\]()!]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, len) + (text.length > len ? "…" : "");
}

/** 모든 발행글 로드 (frontmatter + 본문) */
export function loadPosts() {
  ensureDir(POSTS_DIR);
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  const posts = files.map((file) => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
    const { data, content } = matter(raw);
    return { ...data, body: content, file };
  });
  // 최신순
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** 이미 다룬 제목 + 원천 주제 목록 (중복 발행 방지).
 *  글 제목은 생성 시 모델이 새로 짓기 때문에, 주제 풀과의 비교에는
 *  반드시 source_topic 도 포함해야 한다 (제목만 비교하면 같은 주제가 무한 재생성됨). */
export function existingTitles() {
  const used = new Set();
  for (const p of loadPosts()) {
    if (p.title) used.add(p.title);
    if (p.source_topic) used.add(p.source_topic);
  }
  return used;
}
