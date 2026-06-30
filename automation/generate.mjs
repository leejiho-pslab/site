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
      summary: {
        type: "string",
        description:
          "도입부 핵심 요약(TL;DR). 글의 핵심 가치와 결론을 압축한 280~320자. Featured Snippet 노출을 노린 한 단락.",
      },
      body_markdown: {
        type: "string",
        description:
          "본문(마크다운). 규칙: (1) 첫 문단에 타겟 롱테일 키워드를 자연스럽게 포함. (2) H2(##)·H3(###) 소제목으로 5~7개 섹션. (3) 핵심 수치·결론은 **굵게** 강조. (4) 비교/요건/금액은 마크다운 표로. (5) 신뢰할 수 있는 외부 출처(정부·공공기관 등) 링크를 본문에 최소 2개 [텍스트](https URL) 형식으로 포함. (6) 수치 인용 시 '○○년 ○○ 기준'처럼 출처·시점 명시. (7) '방법'(How to) 단계는 번호 목록으로. (8) 과장·허위 금지, 공식 누리집 확인 권고. 최소 1800자.",
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
    required: ["title", "description", "slug_en", "summary", "body_markdown", "faqs", "tags"],
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

작성 지침(SEO + GEO 최적화):
1. 제목은 클릭을 유도하되 과장/낚시 금지. 핵심 롱테일 키워드를 앞쪽에 배치.
2. summary(TL;DR): 글의 핵심 결론을 280~320자로 압축(도입부에 표시됨).
3. 첫 문단에 타겟 롱테일 키워드를 자연스럽게 포함하고, 이 글에서 얻을 정보를 예고.
4. 본문은 ## 소제목으로 5~7개 구분. 조건·금액·비교는 표로, 절차는 번호 목록으로.
5. 핵심 수치·결론은 **굵게** 강조. 키워드 스터핑은 금지.
6. 신뢰할 수 있는 외부 출처(정부24, 국세청, 한국전력 등 공식기관) 링크를 본문에 2개 이상 포함.
7. 수치는 "○○년 ○○ 기준"처럼 시점·출처를 명시하고 단정적 표현을 피함.
8. 가능하면 정의형(○○란?)·방법형(○○ 방법)·비교형(A vs B) 관점을 1개 이상 포함.
9. 제도/요금/신청 정보는 변경 가능성을 명시하고 공식 누리집 확인을 권고.
10. 마지막에 핵심 체크리스트. FAQ 3~5개는 고객이 실제 검색할 질문 형태로 별도 제공.
11. 분량은 한국어 기준 약 ${site.publishing.targetChars}자, 최소 1800자.

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
    summary: a.summary || "",
    date,
    updated: date,
    category: topic.category,
    keywords: topic.keywords || [],
    tags: a.tags || [],
    slug,
    path: relPath,
    image: `/assets/covers/${slug}.png`,
    imageAlt: `${a.title} - ${site.name} 대표 이미지`,
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

  // 대표 커버 이미지 생성 (Chrome 사용 가능 시). 실패해도 발행은 계속.
  try {
    const { genCover } = await import("./images.mjs");
    genCover({ slug, category: topic.category, title: a.title });
  } catch (e) {
    console.warn(`[generate] 커버 이미지 생략(Chrome 미가용 가능): ${e.message}`);
  }
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
