import { existsSync, readdirSync, statSync, copyFileSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const SOURCE = resolve(import.meta.dirname!, "skills");
const TARGET = resolve(import.meta.dirname!, ".agents", "skills");
const DRY_RUN = process.argv.includes("--dry-run");

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

// Validate source
if (!existsSync(SOURCE)) {
  console.error(`❌ Source not found: ${SOURCE}`);
  process.exit(1);
}

// Discover skills
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
console.log(`📁 Target: ${TARGET}`);

if (DRY_RUN) {
  console.log("\n🔍 Dry run — nothing was changed.");
  if (existsSync(TARGET)) {
    const existing = readdirSync(TARGET);
    console.log(`   Would delete ${existing.length} existing skill(s): ${existing.join(", ")}`);
  }
  console.log(`   Would copy ${sourceSkills.length} skill(s) from ${SOURCE}`);
  process.exit(0);
}

// Clean mirror
if (existsSync(TARGET)) {
  rmSync(TARGET, { recursive: true, force: true });
  console.log("🧹 Cleaned target directory.");
}

// Copy
copyDirSync(SOURCE, TARGET);
console.log(`✅ Synced ${sourceSkills.length} skill(s) to ${TARGET}`);
