// =============================================================
//  전체 파이프라인 오케스트레이터 (100% 자동 발행)
//  1) 시즌성 주제 선택 + Claude API 글 생성
//  2) 정적 사이트 빌드
//  3) (옵션) 구글 블로거 발행
//  GitHub Actions 가 이 스크립트를 크론으로 실행한다.
//
//  환경변수:
//    GENERATE=false  -> 글 생성 건너뛰고 빌드만
//    PUBLISH_BLOGGER=true -> 블로거 발행 수행
// =============================================================
import { execFileSync } from "node:child_process";
import path from "node:path";
import { ROOT } from "./lib.mjs";
import { site } from "../config/site.config.js";

function run(scriptRelPath, label) {
  console.log(`\n=== ${label} ===`);
  execFileSync("node", [path.join(ROOT, scriptRelPath)], { stdio: "inherit" });
}

(async () => {
  const doGenerate = process.env.GENERATE !== "false";
  const doBlogger =
    process.env.PUBLISH_BLOGGER === "true" && site.channels.blogger.enabled;

  if (doGenerate) {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn("[run-all] ANTHROPIC_API_KEY 없음 — 글 생성 건너뜀(빌드만 수행).");
    } else {
      run("automation/generate.mjs", "1) 콘텐츠 생성");
    }
  }

  run("automation/build.mjs", "2) 정적 사이트 빌드");

  if (doBlogger) {
    if (!process.env.BLOGGER_BLOG_ID) {
      console.warn("[run-all] BLOGGER_BLOG_ID 없음 — 블로거 발행 건너뜀.");
    } else {
      run("automation/publish-blogger.mjs", "3) 구글 블로거 발행");
    }
  }

  // 4) 워드프레스 발행 (wpcom 또는 selfhosted 자격증명이 있을 때)
  const wpReady = !!(process.env.WPCOM_SITE && process.env.WPCOM_TOKEN) || !!process.env.WORDPRESS_URL;
  if ((process.env.PUBLISH_WORDPRESS === "true" || site.channels.wordpress.enabled) && wpReady) {
    run("automation/publish-wordpress.mjs", "4) 워드프레스 발행");
  }

  // 5) IndexNow 인덱싱 요청 (키 있을 때만, 기본 키 내장)
  if (site.indexNowKey) {
    run("automation/indexnow.mjs", "5) IndexNow 인덱싱 요청");
  }

  console.log("\n[run-all] 파이프라인 완료.");
})();
