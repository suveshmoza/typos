#!/usr/bin/env node
"use strict";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const npmRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("Usage: node sync-version.mjs <semver>");
  process.exit(1);
}

const platformPackages = [
  "typos-darwin-arm64",
  "typos-darwin-x64",
  "typos-linux-arm64",
  "typos-linux-x64",
  "typos-win32-arm64",
  "typos-win32-x64",
];

function updatePackageJson(filePath) {
  const pkg = JSON.parse(fs.readFileSync(filePath, "utf8"));
  pkg.version = version;
  if (pkg.optionalDependencies) {
    for (const key of Object.keys(pkg.optionalDependencies)) {
      if (key.startsWith("@crate-ci/typos-")) {
        pkg.optionalDependencies[key] = version;
      }
    }
  }
  fs.writeFileSync(filePath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`updated ${path.relative(npmRoot, filePath)} -> ${version}`);
}

updatePackageJson(path.join(npmRoot, "typos", "package.json"));
for (const name of platformPackages) {
  updatePackageJson(path.join(npmRoot, name, "package.json"));
}
