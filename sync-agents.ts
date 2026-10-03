import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { createInterface } from "node:readline";

const HOME = homedir();
const ANTE_HOME = process.env.ANTE_HOME ?? join(HOME, ".ante");
const SOURCE = resolve(import.meta.dirname!, "agents", "AGENTS.md");

const TARGETS = [
  resolve(HOME, ".config", "opencode", "AGENTS.md"),
  join(ANTE_HOME, "AGENTS.md"),
];

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE_YES = process.argv.includes("--yes") || process.argv.includes("-y");
const UNSYNC = process.argv.includes("--unsync");
const TO_INDEX = process.argv.indexOf("--to");
const CUSTOM_TO = TO_INDEX !== -1 ? process.argv[TO_INDEX + 1] : undefined;

if (TO_INDEX !== -1 && !CUSTOM_TO) {
  console.error("❌ --to requires a path argument.");
  process.exit(1);
}

if (!existsSync(SOURCE)) {
  console.error(`❌ Source not found: ${SOURCE}`);
  process.exit(1);
}

const targets = CUSTOM_TO ? [resolve(CUSTOM_TO)] : TARGETS;

console.log(`📋 Source: ${SOURCE}`);
console.log(`📁 Targets: ${targets.join(", ")}`);

if (DRY_RUN) {
  console.log("🔍 Dry run — nothing will be changed.");
  for (const target of targets) {
    if (UNSYNC) {
      if (!existsSync(target)) {
        console.log(`  [dry] skip (missing): ${target}`);
      } else if (readFileSync(target, "utf8") !== readFileSync(SOURCE, "utf8")) {
        console.log(`  [dry] skip (modified by hand, not synced from source): ${target}`);
      } else {
        console.log(`  [dry] delete: ${target}`);
      }
    } else {
      console.log(`  [dry] ${SOURCE} → ${target}`);
    }
  }
  console.log(`\n🔍 Would ${UNSYNC ? "unsync from" : "sync to"} ${targets.length} target(s).`);
  process.exit(0);
}

async function confirmAll(): Promise<boolean> {
  if (FORCE_YES) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ans = await new Promise<string>((res) =>
    rl.question("   Tiếp tục? (y/n, mặc định y): ", res),
  );
  rl.close();
  return ans.trim() === "" || ["y", "yes"].includes(ans.trim().toLowerCase());
}

if (!(await confirmAll())) {
  console.log("❌ Đã hủy.");
  process.exit(0);
}

if (UNSYNC) {
  let deleted = 0;
  let skipped = 0;
  const sourceContent = readFileSync(SOURCE, "utf8");
  for (const target of targets) {
    if (!existsSync(target)) {
      console.log(`  ⏭️  Bỏ qua (không tồn tại): ${target}`);
      skipped++;
      continue;
    }
    if (readFileSync(target, "utf8") !== sourceContent) {
      console.log(`  ⚠️  Bỏ qua (đã bị sửa tay, không phải bản sync từ source): ${target}`);
      console.log(`     Xoá tay nếu chắc chắn, hoặc sync lại rồi unsync.`);
      skipped++;
      continue;
    }
    rmSync(target);
    console.log(`  🗑️  Đã xoá: ${target}`);
    deleted++;
  }
  console.log(`\n🎉 Done! Deleted ${deleted}, skipped ${skipped}.`);
} else {
  for (const target of targets) {
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(SOURCE, target);
    console.log(`  ✅ ${target}`);
  }

  console.log(`\n🎉 Done! Synced to ${targets.length} target(s).`);
}
