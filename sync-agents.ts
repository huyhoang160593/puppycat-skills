import { existsSync, readdirSync, statSync, copyFileSync, mkdirSync, rmSync, renameSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { homedir } from "node:os";
import { createInterface } from "node:readline";

// ─── Config ────────────────────────────────────────────────────────────────────

const SOURCE = resolve(import.meta.dirname!, "agents");
const HOME = homedir();

interface Destination {
  id: number;
  label: string;
  path: string;
  level: "workspace" | "global";
  tool: string;
  /** Transform filename when copying (e.g. Puppycat.md → Puppycat.agent.md) */
  transformFilename?: (name: string) => string;
}

const DESTINATIONS: Destination[] = [
  {
    id: 1,
    label: ".github/agents/",
    path: resolve(".github", "agents"),
    level: "workspace",
    tool: "Copilot",
    transformFilename: (n) => n.replace(/\.md$/, ".agent.md"),
  },
  {
    id: 2,
    label: ".claude/agents/",
    path: resolve(".claude", "agents"),
    level: "workspace",
    tool: "Claude Code",
  },
  {
    id: 3,
    label: "~/.copilot/agents/",
    path: resolve(HOME, ".copilot", "agents"),
    level: "global",
    tool: "Copilot",
    transformFilename: (n) => n.replace(/\.md$/, ".agent.md"),
  },
  {
    id: 4,
    label: "~/.claude/agents/",
    path: resolve(HOME, ".claude", "agents"),
    level: "global",
    tool: "Claude Code",
  },
  {
    id: 5,
    label: "~/.agents/agents/",
    path: resolve(HOME, ".agents", "agents"),
    level: "global",
    tool: ".agents convention",
  },
];

// ─── Args ──────────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run");
const SYNC_ALL = process.argv.includes("--all");
const TO_FLAG = process.argv.includes("--to");
const TO_INDEX = process.argv.indexOf("--to");
const CUSTOM_TO = TO_FLAG && TO_INDEX !== -1 ? process.argv[TO_INDEX + 1] : undefined;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function isAgentFile(file: string): boolean {
  return file.endsWith(".md");
}

function copyFileSync2(src: string, dest: string) {
  mkdirSync(resolve(dest, ".."), { recursive: true });
  copyFileSync(src, dest);
}

async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(question, (ans) => { rl.close(); res(ans.trim()); }));
}

async function confirmOverwrite(filePath: string): Promise<boolean> {
  const ans = await ask(`⚠️  ${filePath} đã tồn tại. Ghi đè? (y/N) `);
  return ans.toLowerCase() === "y";
}

// ─── Discover agents ───────────────────────────────────────────────────────────

if (!existsSync(SOURCE)) {
  console.error(`❌ Source not found: ${SOURCE}`);
  process.exit(1);
}

const agents = readdirSync(SOURCE).filter((f) => {
  const full = join(SOURCE, f);
  if (!statSync(full).isFile()) return false;
  if (!isAgentFile(f)) {
    console.warn(`⚠️  Skipping "${f}" — not a .md file`);
    return false;
  }
  return true;
});

if (agents.length === 0) {
  console.error("❌ No agents found in", SOURCE);
  process.exit(1);
}

console.log(`📋 Found ${agents.length} agent(s): ${agents.map((a) => a.replace(/\.md$/, "")).join(", ")}`);
console.log(`📁 Source: ${SOURCE}\n`);

// ─── Select destinations ───────────────────────────────────────────────────────

let selectedDests: Destination[];

if (CUSTOM_TO) {
  // --to flag: use custom path
  selectedDests = [{
    id: 0,
    label: CUSTOM_TO,
    path: resolve(CUSTOM_TO),
    level: "workspace",
    tool: "custom",
  }];
} else if (SYNC_ALL) {
  selectedDests = DESTINATIONS;
} else {
  // Interactive menu
  console.log("  Workspace:");
  DESTINATIONS.filter((d) => d.level === "workspace").forEach((d) =>
    console.log(`  ${d.id}) ${d.label.padEnd(22)} (${d.tool})`)
  );
  console.log("\n  Global:");
  DESTINATIONS.filter((d) => d.level === "global").forEach((d) =>
    console.log(`  ${d.id}) ${d.label.padEnd(22)} (${d.tool})`)
  );
  console.log(`\n  ${DESTINATIONS.length + 1}) Custom path...`);

  const answer = await ask("\n? Chọn destination (phân cách bằng dấu phẩy): ");
  const nums = answer.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));

  if (nums.length === 0) {
    console.error("❌ Không có destination nào được chọn.");
    process.exit(1);
  }

  selectedDests = nums
    .map((n) => {
      if (n === DESTINATIONS.length + 1) {
        const custom = ask("? Nhập đường dẫn: ");
        // Note: this is sync-blocking but fine for a CLI tool
        return null; // handled below
      }
      return DESTINATIONS.find((d) => d.id === n);
    })
    .filter(Boolean) as Destination[];

  // Handle custom path selection
  if (nums.includes(DESTINATIONS.length + 1)) {
    const customPath = await ask("? Nhập đường dẫn custom: ");
    selectedDests.push({
      id: 0,
      label: customPath,
      path: resolve(customPath),
      level: "workspace",
      tool: "custom",
    });
  }

  if (selectedDests.length === 0) {
    console.error("❌ Không có destination hợp lệ.");
    process.exit(1);
  }
}

// ─── Sync ──────────────────────────────────────────────────────────────────────

let totalSynced = 0;

for (const dest of selectedDests) {
  console.log(`\n─── ${dest.label} (${dest.tool}) ───`);

  mkdirSync(dest.path, { recursive: true });

  let synced = 0;

  for (const agent of agents) {
    const srcPath = join(SOURCE, agent);
    const destFilename = dest.transformFilename ? dest.transformFilename(agent) : agent;
    const destPath = join(dest.path, destFilename);

    if (DRY_RUN) {
      console.log(`  [dry] ${agent} → ${destFilename}`);
      synced++;
      continue;
    }

    // Conflict check
    if (existsSync(destPath)) {
      const overwrite = await confirmOverwrite(destPath);
      if (!overwrite) {
        console.log(`  ⏭️  Bỏ qua: ${destFilename}`);
        continue;
      }
    }

    copyFileSync2(srcPath, destPath);
    console.log(`  ✅ ${agent} → ${destFilename}`);
    synced++;
  }

  console.log(`  → Synced ${synced}/${agents.length} agent(s)`);
  totalSynced += synced;
}

// ─── Summary ───────────────────────────────────────────────────────────────────

if (DRY_RUN) {
  console.log(`\n🔍 Dry run — nothing was changed. Would sync ${totalSynced} agent(s) across ${selectedDests.length} destination(s).`);
} else {
  console.log(`\n✅ Done. Synced ${totalSynced} agent(s) across ${selectedDests.length} destination(s).`);
}
