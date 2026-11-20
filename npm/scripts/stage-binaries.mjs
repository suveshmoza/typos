#!/usr/bin/env node
"use strict";

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const npmRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const platforms = [
  {
    name: "typos-darwin-arm64",
    target: "aarch64-apple-darwin",
    binary: "typos",
  },
  {
    name: "typos-darwin-x64",
    target: "x86_64-apple-darwin",
    binary: "typos",
  },
  {
    name: "typos-linux-arm64",
    target: "aarch64-unknown-linux-musl",
    binary: "typos",
  },
  {
    name: "typos-linux-x64",
    target: "x86_64-unknown-linux-musl",
    binary: "typos",
  },
  {
    name: "typos-win32-arm64",
    target: "aarch64-pc-windows-msvc",
    binary: "typos.exe",
  },
  {
    name: "typos-win32-x64",
    target: "x86_64-pc-windows-msvc",
    binary: "typos.exe",
  },
];

const archivesDir = process.argv[2];

if (!archivesDir) {
  console.error("Usage: node stage-binaries.mjs <release-archives-dir>");
  process.exit(1);
}

const resolvedArchives = path.resolve(archivesDir);
if (!fs.existsSync(resolvedArchives)) {
  console.error(`Archives directory not found: ${resolvedArchives}`);
  process.exit(1);
}

const archiveFiles = fs.readdirSync(resolvedArchives);

function findArchive(target) {
  const match = archiveFiles.find(
    (name) =>
      name.includes(`-${target}.`) &&
      (name.endsWith(".tar.gz") || name.endsWith(".zip")),
  );
  return match ? path.join(resolvedArchives, match) : null;
}

function extractBinary(archive, binary) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "typos-npm-"));
  try {
    if (archive.endsWith(".zip")) {
      execFileSync("unzip", ["-o", "-q", archive, binary, "-d", tmp]);
    } else {
      execFileSync("tar", ["-xzf", archive, "-C", tmp, binary]);
    }
    const extracted = path.join(tmp, binary);
    if (!fs.existsSync(extracted)) {
      throw new Error(`archive ${path.basename(archive)} missing ${binary}`);
    }
    return { extracted, tmp };
  } catch (error) {
    fs.rmSync(tmp, { recursive: true, force: true });
    throw error;
  }
}

let failed = false;

for (const { name, target, binary } of platforms) {
  const archive = findArchive(target);
  if (!archive) {
    console.error(`Missing release archive for ${name} (target ${target})`);
    failed = true;
    continue;
  }

  let tmp;
  try {
    const result = extractBinary(archive, binary);
    tmp = result.tmp;
    const dest = path.join(npmRoot, name, binary);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(result.extracted, dest);
    fs.chmodSync(dest, 0o755);
    console.log(
      `staged ${path.relative(npmRoot, dest)} <- ${path.basename(archive)}`,
    );
  } catch (error) {
    console.error(
      `Failed to stage ${name}: ${error instanceof Error ? error.message : error}`,
    );
    failed = true;
  } finally {
    if (tmp) {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
}

if (failed) {
  process.exit(1);
}
