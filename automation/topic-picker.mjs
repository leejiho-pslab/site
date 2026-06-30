// =============================================================
//  시즌성 주제 선택기
//  - 현재 월(KST)의 주제 풀에서 아직 발행하지 않은 주제를 선택
//  - 같은 달 주제를 모두 소진하면 인접 월/카테고리로 폴백
//  - 옵션: NaverSearch datalab(MCP)로 실시간 트렌드를 반영하려면
//    automation/trend.mjs 의 결과를 우선순위에 반영(아래 주석 참고)
// =============================================================
import path from "node:path";
import { ROOT, readJson, nowKST, existingTitles } from "./lib.mjs";

const TOPICS = readJson(path.join(ROOT, "config", "topics", "seasonal-topics.json"));

/**
 * 발행할 주제 N개를 고른다.
 * @param {number} count 뽑을 주제 수
 * @returns {Array<{title, category, keywords, month}>}
 */
export function pickTopics(count = 1) {
  const kst = nowKST();
  const month = kst.getMonth() + 1; // 1~12
  const used = existingTitles();

  // 현재 월 -> 다음 월 -> 이전 월 순으로 후보 구성 (시의성 우선)
  const order = [month, (month % 12) + 1, ((month + 10) % 12) + 1];
  const candidates = [];
  for (const m of order) {
    for (const t of TOPICS[String(m)] || []) {
      if (!used.has(t.title) && !candidates.find((c) => c.title === t.title)) {
        candidates.push({ ...t, month: m });
      }
    }
  }

  if (candidates.length === 0) {
    // 모든 시즌 주제 소진 시: 가장 오래 안 다룬 카테고리 기반 일반 주제 폴백
    console.warn("[topic-picker] 시즌 주제 풀 소진 — 다음 달 주제를 재사용합니다.");
    const all = Object.values(TOPICS).flat();
    return all.slice(0, count).map((t) => ({ ...t, month }));
  }

  return candidates.slice(0, count);
}

// CLI: 선택된 주제를 JSON 으로 출력
if (import.meta.url === `file://${process.argv[1]}`) {
  const count = Number(process.argv[2] || 1);
  console.log(JSON.stringify(pickTopics(count), null, 2));
}
