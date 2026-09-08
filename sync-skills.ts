import { existsSync, readdirSync, statSync, copyFileSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { createInterface } from "node:readline";

const SOURCE = resolve(import.meta.dirname!, "skills");
const LOCAL_TARGET = resolve(import.meta.dirname!, ".agents", "skills");
const GLOBAL_TARGET = join(homedir(), ".agents", "skills");
const DRY_RUN = process.argv.includes("--dry-run");

// --- Flags: presence = run directly, no interactive ---
const wantsLocal = process.argv.includes("--local");
const wantsGlobal = process.argv.includes("--global");
const wantsAll = process.argv.includes("--all");
const hasAnyFlag = wantsLocal || wantsGlobal || wantsAll;

// --- Helpers ---
function isSkillDir(dir: string): boolean {
  return existsSync(join(dir, "SKILL.md"));
}

function copyDirSync(src: string, dest: string) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

function cleanMirror(target: string, skillNames: string[]) {
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
  }
  mkdirSync(target, { recursive: true });
  for (const name of skillNames) {
    copyDirSync(join(SOURCE, name), join(target, name));
  }
}

function additiveSync(target: string, skillNames: string[]) {
  mkdirSync(target, { recursive: true });
  for (const name of skillNames) {
    const destPath = join(target, name);
    if (existsSync(destPath)) {
      rmSync(destPath, { recursive: true, force: true });
    }
    copyDirSync(join(SOURCE, name), destPath);
  }
}

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => {
    rl.question(question, (answer) => {
      rl.close();
      res(answer.trim().toLowerCase());
    });
  });
}

// --- Validate source ---
if (!existsSync(SOURCE)) {
  console.error(`❌ Source not found: ${SOURCE}`);
  process.exit(1);
}

// --- Discover skills ---
const sourceSkills = readdirSync(SOURCE).filter((name) => {
  const dir = join(SOURCE, name);
  if (!statSync(dir).isDirectory()) return false;
  if (!isSkillDir(dir)) {
    console.warn(`⚠️  Skipping "${name}" — no SKILL.md found`);
    return false;
  }
  return true;
});

console.log(`📋 Found ${sourceSkills.length} skill(s): ${sourceSkills.join(", ")}`);

// --- Resolve targets ---
let doLocal: boolean;
let doGlobal: boolean;

if (hasAnyFlag) {
  // Flags present → run directly, no interactive
  doLocal = wantsLocal || wantsAll;
  doGlobal = wantsGlobal || wantsAll;
} else {
  // No flags → interactive
  console.log(`\n🎯 Chọn target sync:`);
  console.log(`   [1] Local  → ${LOCAL_TARGET}`);
  console.log(`   [2] Global → ${GLOBAL_TARGET}`);
  console.log(`   [3] Cả hai`);
  const choice = await prompt(`   Chọn (1/2/3, mặc định 3): `);
  doLocal = choice === "1" || choice === "3" || choice === "";
  doGlobal = choice === "2" || choice === "3" || choice === "";

  const targets: string[] = [];
  if (doLocal) targets.push("Local");
  if (doGlobal) targets.push("Global");
  console.log(`\n📋 Sẽ sync ${sourceSkills.length} skill(s): ${sourceSkills.join(", ")}`);
  console.log(`📁 Targets: ${targets.join(", ")}`);
  if (DRY_RUN) console.log("🔍 Dry run — nothing will be changed.");

  const ok = await prompt("   Tiếp tục? (y/n, mặc định y): ");
  if (ok !== "" && ok !== "y") {
    console.log("❌ Đã hủy.");
    process.exit(0);
  }
}

// --- Execute ---
const targets: { name: string; path: string; additive: boolean }[] = [];
if (doLocal) targets.push({ name: "Local", path: LOCAL_TARGET, additive: false });
if (doGlobal) targets.push({ name: "Global", path: GLOBAL_TARGET, additive: true });

if (targets.length === 0) {
  console.log("ℹ️  Không có target nào được chọn.");
  process.exit(0);
}

for (const t of targets) {
  console.log(`\n📁 ${t.name}: ${t.path}`);

  if (DRY_RUN) {
    if (t.additive) {
      const existing = existsSync(t.path) ? readdirSync(t.path) : [];
      const newSkills = sourceSkills.filter((s) => !existing.includes(s));
      const updateSkills = sourceSkills.filter((s) => existing.includes(s));
      console.log(`   Would add ${newSkills.length} new: ${newSkills.join(", ") || "—"}`);
      console.log(`   Would update ${updateSkills.length} existing: ${updateSkills.join(", ") || "—"}`);
      console.log(`   Keeping ${existing.length} other skill(s) untouched`);
    } else {
      const existing = existsSync(t.path) ? readdirSync(t.path) : [];
      console.log(`   Would delete ${existing.length} existing: ${existing.join(", ") || "—"}`);
      console.log(`   Would copy ${sourceSkills.length} skill(s)`);
    }
    continue;
  }

  if (t.additive) {
    additiveSync(t.path, sourceSkills);
    console.log(`   ✅ Synced ${sourceSkills.length} skill(s) (additive)`);
  } else {
    cleanMirror(t.path, sourceSkills);
    console.log(`   ✅ Synced ${sourceSkills.length} skill(s) (clean mirror)`);
  }
}

console.log(`\n🎉 Done! Synced ${sourceSkills.length} skill(s) to ${targets.length} target(s).`);
