#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';

function readMaxTagPatch() {
  try {
    const out = execSync('git tag -l "v0.1*"', { encoding: 'utf8' });
    let max = 0;
    for (const raw of out.split(/\r?\n/)) {
      const tag = raw.trim();
      if (tag === 'v0.1') max = Math.max(max, 0);
      const match = /^v0\.1\.(\d+)$/.exec(tag);
      if (match) max = Math.max(max, Number(match[1]));
    }
    return max;
  } catch {
    return 0;
  }
}

function readFilePatch() {
  if (!fs.existsSync('VERSION')) return 0;
  const raw = fs.readFileSync('VERSION', 'utf8').trim();
  const match = /^0\.1\.(\d+)$/.exec(raw);
  return match ? Number(match[1]) : 0;
}

const nextPatch = Math.max(readMaxTagPatch(), readFilePatch()) + 1;
const nextVersion = `0.1.${nextPatch}`;
fs.writeFileSync('VERSION', `${nextVersion}\n`);

if (fs.existsSync('index.html')) {
  const html = fs.readFileSync('index.html', 'utf8');
  const updated = html.replace(
    /(<span class="patio-version" id="app-version">)v[^<]*(<\/span>)/,
    `$1v${nextVersion}$2`
  );
  if (updated !== html) fs.writeFileSync('index.html', updated);
}

console.log(nextVersion);
