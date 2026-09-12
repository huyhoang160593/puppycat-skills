import { existsSync, readdirSync, statSync, copyFileSync, mkdirSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
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
const FORCE_YES = process.argv.includes("--yes") || process.argv.includes("-y");
const TO_INDEX = process.argv.indexOf("--to");
const CUSTOM_TO = TO_INDEX !== -1 ? process.argv[TO_INDEX + 1] : undefined;

if (TO_INDEX !== -1 && !CUSTOM_TO) {
  console.error("❌ --to requires a path argument. Use --to <path> or run without --to for interactive menu.");
  process.exit(1);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const rl = createInterface({ input: process.stdin, output: process.stdout });

function isAgentFile(file: string): boolean {
  return file.endsWith(".md");
}

function copyFileSync2(src: string, dest: string) {
  mkdirSync(resolve(dest, ".."), { recursive: true });
  copyFileSync(src, dest);
}

/**
 * Robust path comparison: resolves symlinks, normalizes trailing slashes.
 * Returns false if either path doesn't exist yet (can't compare real paths).
 */
function pathsMatch(a: string, b: string): boolean {
  try {
    return realpathSync(a) === realpathSync(b);
  } catch {
    return resolve(a) === resolve(b);
  }
}

function ask(question: string): Promise<string> {
  return new Promise((res) => rl.question(question, (ans) => res(ans.trim())));
}

async function confirmOverwrite(filePath: string): Promise<boolean> {
  if (FORCE_YES) {
    console.log(`  ⚠️  Overwriting existing file (forced): ${filePath}`);
    return true;
  }
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
  // --to flag: reuse existing destination if path matches, otherwise create custom
  const existing = DESTINATIONS.find((d) => pathsMatch(d.path, CUSTOM_TO));
  if (existing) {
    selectedDests = [existing];
  } else {
    const resolvedPath = resolve(CUSTOM_TO);
    selectedDests = [{
      id: 0,
      label: CUSTOM_TO,
      path: resolvedPath,
      level: resolvedPath.startsWith(HOME) ? "global" : "workspace",
      tool: "custom",
    }];
  }
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
        return null; // handled below
      }
      return DESTINATIONS.find((d) => d.id === n);
    })
    .filter(Boolean) as Destination[];

  // Handle custom path selection
  if (nums.includes(DESTINATIONS.length + 1)) {
    const customPath = await ask("? Nhập đường dẫn custom: ");
    const existing = DESTINATIONS.find((d) => pathsMatch(d.path, customPath));
    if (existing) {
      // Reuse existing destination (preserves transformFilename, tool, level)
      selectedDests.push(existing);
    } else {
      const resolvedPath = resolve(customPath);
      selectedDests.push({
        id: 0,
        label: customPath,
        path: resolvedPath,
        level: resolvedPath.startsWith(HOME) ? "global" : "workspace",
        tool: "custom",
      });
    }
  }

  if (selectedDests.length === 0) {
    console.error("❌ Không có destination hợp lệ.");
    process.exit(1);
  }
}

// Deduplicate by path
selectedDests = [...new Map(selectedDests.map((d) => [d.path, d])).values()];

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

rl.close();
