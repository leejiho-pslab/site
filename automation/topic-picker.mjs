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
    // 전체 연간 풀에서 미발행 주제 폴백 (시의성은 떨어지지만 중복보다 낫다)
    const rest = Object.values(TOPICS).flat().filter((t) => !used.has(t.title));
    if (rest.length) {
      console.warn("[topic-picker] 시즌(인접월) 주제 소진 — 연간 풀에서 미발행 주제를 사용합니다.");
      return rest.slice(0, count).map((t) => ({ ...t, month }));
    }
    // 진짜 소진: 같은 주제를 재생성하느니 이번 회차 발행을 건너뛴다 (중복 콘텐츠 방지)
    console.warn("[topic-picker] 주제 풀 완전 소진 — 생성을 건너뜁니다. topics/seasonal-topics.json 을 보충하세요.");
    return [];
  }

  return candidates.slice(0, count);
}

// CLI: 선택된 주제를 JSON 으로 출력
if (import.meta.url === `file://${process.argv[1]}`) {
  const count = Number(process.argv[2] || 1);
  console.log(JSON.stringify(pickTopics(count), null, 2));
}
