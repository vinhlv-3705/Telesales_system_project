const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const parseEnvFile = (filePath) => {
  const out = {};
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
};

const describeDb = (rawUrl) => {
  if (!rawUrl) return "(missing DATABASE_URL)";
  try {
    const u = new URL(rawUrl);
    return `${u.hostname}${u.port ? ":" + u.port : ""}/${(u.pathname || "").replace("/", "")}`;
  } catch {
    return "(invalid DATABASE_URL)";
  }
};

const stripSslParamsIfInsecure = (rawUrl) => {
  // If user sets PG_SSL_REJECT_UNAUTHORIZED=false, we try to remove ssl params that can override ssl behavior.
  try {
    const u = new URL(rawUrl);
    u.searchParams.delete("sslmode");
    u.searchParams.delete("ssl");
    return u.toString();
  } catch {
    return rawUrl;
  }
};

const encodePasswordIfNeeded = (rawUrl) => {
  try {
    // Avoid double-encoding: if password already has percent-escapes in the raw URL, keep it.
    // We only encode the raw password segment in the URL userinfo part: protocol://user:pass@host
    const userInfoMatch = rawUrl.match(/\/\/([^:/?#]+):([^@]*)@/);
    if (!userInfoMatch) return rawUrl;

    const username = userInfoMatch[1];
    const passwordRawSegment = userInfoMatch[2] ?? "";

    if (!passwordRawSegment) return rawUrl;
    if (passwordRawSegment.includes("%")) return rawUrl;

    const encoded = encodeURIComponent(passwordRawSegment);
    return rawUrl.replace(`//${username}:${passwordRawSegment}@`, `//${username}:${encoded}@`);
  } catch {
    return rawUrl;
  }
};

const run = (cmd, args, opts = {}) => {
  const res = spawnSync(cmd, args, { stdio: "inherit", shell: false, ...opts });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    const err = new Error(`${cmd} exited with code ${res.status}`);
    err.code = res.status;
    throw err;
  }
};

const runCapture = (cmd, args, opts = {}) => {
  const res = spawnSync(cmd, args, {
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
    encoding: "utf8",
    ...opts,
  });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    const stderr = String(res.stderr || "").trim();
    const err = new Error(stderr || `${cmd} exited with code ${res.status}`);
    err.code = res.status;
    throw err;
  }
  return String(res.stdout || "").trim();
};

const checkPostgresToolsOnPath = () => {
  try {
    const dumpVersion = runCapture("pg_dump", ["--version"]);
    const restoreVersion = runCapture("pg_restore", ["--version"]);
    return { ok: true, dumpVersion, restoreVersion };
  } catch (err) {
    return {
      ok: false,
      error: err && err.message ? err.message : String(err),
    };
  }
};

const askYes = async (question) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => rl.question(question, resolve));
  rl.close();
  return String(answer).trim();
};

(async () => {
  const root = path.resolve(__dirname, "..");
  const prodPath = path.join(root, ".env.production");
  const localPath = path.join(root, ".env.local");

  if (process.argv.includes("--check-tools")) {
    const check = checkPostgresToolsOnPath();
    if (!check.ok) {
      console.error("[db:clone] PostgreSQL tools NOT available via System PATH.");
      console.error("[db:clone] Error:", check.error);
      console.error(
        "[db:clone] If you just updated Windows PATH, please restart Windsurf (Restart Language Server / restart IDE) so the new environment is picked up."
      );
      process.exit(1);
    }
    console.log("[db:clone] pg_dump:", check.dumpVersion);
    console.log("[db:clone] pg_restore:", check.restoreVersion);
    process.exit(0);
  }

  const check = checkPostgresToolsOnPath();
  if (!check.ok) {
    console.error("\n[db:clone] PostgreSQL tools NOT available via System PATH.");
    console.error("[db:clone] Error:", check.error);
    console.error(
      "[db:clone] If you just updated Windows PATH, please restart Windsurf (Restart Language Server / restart IDE) so the new environment is picked up."
    );
    process.exit(1);
  }

  if (!fs.existsSync(prodPath)) throw new Error("Missing .env.production");
  if (!fs.existsSync(localPath)) throw new Error("Missing .env.local");

  const prod = parseEnvFile(prodPath);
  const local = parseEnvFile(localPath);

  const prodUrlRaw = prod.DATABASE_URL;
  const localUrlRaw = local.DATABASE_URL;

  if (!prodUrlRaw) throw new Error(".env.production DATABASE_URL is empty");
  if (!localUrlRaw) throw new Error(".env.local DATABASE_URL is empty");

  const insecureProd = String(prod.PG_SSL_REJECT_UNAUTHORIZED).toLowerCase() === "false";
  const insecureLocal = String(local.PG_SSL_REJECT_UNAUTHORIZED).toLowerCase() === "false";

  const prodUrlBase = insecureProd ? stripSslParamsIfInsecure(prodUrlRaw) : prodUrlRaw;
  const localUrlBase = insecureLocal ? stripSslParamsIfInsecure(localUrlRaw) : localUrlRaw;

  const prodUrl = encodePasswordIfNeeded(prodUrlBase);
  const localUrl = encodePasswordIfNeeded(localUrlBase);

  console.log("\n[db:clone] Source (PROD):", describeDb(prodUrlRaw));
  console.log("[db:clone] Target (LOCAL):", describeDb(localUrlRaw));

  const confirmation = await askYes(
    "\nThis will OVERWRITE the LOCAL database by restoring a dump from PROD. Type YES to continue: "
  );
  if (String(confirmation).trim().toUpperCase() !== "YES") {
    console.log("Aborted.");
    process.exit(1);
  }

  const dumpFile = path.join(root, "scripts", `prod_dump_${Date.now()}.dump`);

  console.log("\n[db:clone] Running pg_dump...");
  const schemaToClone = process.env.CLONE_SCHEMA || "public";
  run("pg_dump", [
    prodUrl,
    "--format=custom",
    "--no-owner",
    "--no-privileges",
    "--schema",
    schemaToClone,
    "--exclude-schema=auth",
    "--exclude-schema=storage",
    "--exclude-schema=realtime",
    "--exclude-schema=extensions",
    "--exclude-schema=graphql",
    "--exclude-schema=graphql_public",
    "--exclude-schema=supabase_migrations",
    "--exclude-schema=pgbouncer",
    "--file",
    dumpFile,
  ]);

  console.log("\n[db:clone] Running pg_restore...");
  run("pg_restore", [
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    "--dbname",
    localUrl,
    dumpFile,
  ]);

  console.log("\n[db:clone] Done.");
  console.log("Dump file kept at:", dumpFile);
  console.log("You can delete it manually after verifying the local DB.");
})().catch((err) => {
  console.error("\n[db:clone] FAILED:", err && err.message ? err.message : err);
  process.exit(1);
});
