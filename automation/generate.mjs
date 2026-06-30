// =============================================================
//  콘텐츠 자동 생성 (Claude API)
//  - 선택된 시즌성 주제로 SEO 최적화 한국어 글을 생성
//  - 구조화 출력(tool use)으로 제목/설명/본문/FAQ/키워드 확보
//  - content/posts/<date>-<slug>.md 로 frontmatter 포함 저장
//
//  필요 환경변수: ANTHROPIC_API_KEY
//  모델 선택: CONTENT_MODEL (기본 claude-sonnet-4-6)
// =============================================================
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import matter from "gray-matter";
import { site } from "../config/site.config.js";
import { pickTopics } from "./topic-picker.mjs";
import { rankByTrend } from "./trend.mjs";
import { POSTS_DIR, ensureDir, slugify, todayKST } from "./lib.mjs";

const MODEL = process.env.CONTENT_MODEL || "claude-sonnet-4-6";

const ARTICLE_TOOL = {
  name: "save_article",
  description: "생성한 SEO 블로그 글을 구조화하여 저장한다.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "검색 친화적 제목 (32자 내외, 핵심 키워드 포함)" },
      description: { type: "string", description: "메타 설명 (검색결과 노출용, 80~155자)" },
      slug_en: {
        type: "string",
        description: "URL용 영문 슬러그 (소문자-하이픈, 예: year-end-tax-refund). 한글 금지.",
      },
      body_markdown: {
        type: "string",
        description:
          "본문(마크다운). H2(##)·H3(###) 소제목으로 5~7개 섹션 구성. 표/목록 적극 활용. 도입부 2~3문장, 각 섹션 충실. 과장·허위 정보 금지, 공식 기관 확인 권고 포함. 최소 1800자 이상.",
      },
      faqs: {
        type: "array",
        description: "자주 묻는 질문 3~5개 (FAQ 리치결과용)",
        items: {
          type: "object",
          properties: { q: { type: "string" }, a: { type: "string" } },
          required: ["q", "a"],
        },
      },
      tags: { type: "array", items: { type: "string" }, description: "태그 4~6개" },
    },
    required: ["title", "description", "slug_en", "body_markdown", "faqs", "tags"],
  },
};

function buildPrompt(topic) {
  const cat = site.categories.find((c) => c.slug === topic.category);
  return `당신은 한국의 생활정보 블로그 "${site.name}"의 전문 에디터입니다.
아래 주제로 검색엔진 상위노출(SEO)에 최적화된 한국어 블로그 글을 작성하세요.

[주제] ${topic.title}
[카테고리] ${cat ? cat.name : topic.category} — ${cat ? cat.desc : ""}
[핵심 키워드] ${(topic.keywords || []).join(", ")}
[대상 독자] 실생활 정보를 빠르게 얻고 싶은 일반 한국인

작성 지침:
1. 제목은 클릭을 유도하되 과장/낚시는 금지. 핵심 키워드를 앞쪽에 배치.
2. 도입부에서 독자의 고민/상황을 짚고, 이 글에서 얻을 정보를 예고.
3. 본문은 ## 소제목으로 명확히 구분(5~7개). 단계·조건·금액 등은 표나 목록으로.
4. 핵심 키워드와 연관 키워드를 자연스럽게 반복(키워드 스터핑 금지).
5. 정확하지 않은 수치는 단정하지 말고 "○○ 기준" "공식 누리집 확인" 등으로 안내.
6. 제도/요금/신청 정보는 변경 가능성을 명시하고 공식 출처 확인을 권고.
7. 마지막에 한 줄 요약 또는 핵심 체크리스트.
8. FAQ 3~5개를 별도로 제공(본문과 중복 최소화).
9. 분량은 한국어 기준 약 ${site.publishing.targetChars}자, 최소 1800자.

반드시 save_article 도구를 호출하여 결과를 저장하세요.`;
}

export async function generateOne(topic) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 환경변수가 필요합니다.");
  const client = new Anthropic({ apiKey });

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    tools: [ARTICLE_TOOL],
    tool_choice: { type: "tool", name: "save_article" },
    messages: [{ role: "user", content: buildPrompt(topic) }],
  });

  const toolUse = msg.content.find((b) => b.type === "tool_use");
  if (!toolUse) throw new Error("모델이 save_article 도구를 호출하지 않았습니다.");
  const a = toolUse.input;

  const date = todayKST();
  const slug = a.slug_en && /[a-z]/.test(a.slug_en) ? slugify(a.slug_en) : slugify(a.title);
  const fileName = `${date}-${slug}.md`;
  const relPath = `/posts/${slug}/`;

  const front = {
    title: a.title,
    description: a.description,
    date,
    updated: date,
    category: topic.category,
    keywords: topic.keywords || [],
    tags: a.tags || [],
    slug,
    path: relPath,
    faqs: a.faqs || [],
    source_topic: topic.title,
    channels: { site: true, blogger: site.channels.blogger.enabled },
    published: { blogger: false }, // 발행 추적 (publish-blogger.mjs 가 갱신)
  };

  ensureDir(POSTS_DIR);
  const out = matter.stringify(a.body_markdown.trim() + "\n", front);
  const filePath = path.join(POSTS_DIR, fileName);
  fs.writeFileSync(filePath, out, "utf8");
  console.log(`[generate] 저장됨: content/posts/${fileName}`);
  return filePath;
}

export async function generateBatch(count = site.publishing.postsPerRun) {
  // 시즌 후보를 넉넉히 뽑은 뒤(트렌드 정렬 여지) 상위 count개만 생성
  let topics = pickTopics(Math.max(count * 3, count));
  if (!topics.length) {
    console.log("[generate] 생성할 주제가 없습니다.");
    return [];
  }
  topics = (await rankByTrend(topics)).slice(0, count);
  const files = [];
  for (const t of topics) {
    console.log(`[generate] 주제: ${t.title}`);
    files.push(await generateOne(t));
  }
  return files;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const count = Number(process.argv[2] || site.publishing.postsPerRun);
  generateBatch(count)
    .then((f) => console.log(`[generate] 완료: ${f.length}편`))
    .catch((e) => {
      console.error("[generate] 오류:", e.message);
      process.exit(1);
    });
}
