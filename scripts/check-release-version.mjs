import { appendFileSync, readFileSync } from 'node:fs';
import process from 'node:process';

const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME;

const fail = (message) => {
  console.error(`release version check failed: ${message}`);
  process.exit(64);
};

if (!tag) {
  fail('provide a release tag argument or set GITHUB_REF_NAME');
}

const match = /^v([0-9]+\.[0-9]+\.[0-9]+)$/.exec(tag);

if (!match) {
  fail(`release tag must match vX.Y.Z, got ${tag}`);
}

const version = match[1];
const minor = version.split('.').slice(0, 2).join('.');

const readText = (path) => readFileSync(path, 'utf8');

const packageJson = JSON.parse(readText('package.json'));
const packageVersion = packageJson.version;

const readTomlPackageVersion = (toml) => {
  let inPackage = false;

  for (const line of toml.split('\n')) {
    if (/^\[package\]\s*$/.test(line)) {
      inPackage = true;
      continue;
    }

    if (inPackage && /^\[/.test(line)) {
      break;
    }

    if (inPackage) {
      const versionLine = /^version\s*=\s*"([^"]+)"\s*$/.exec(line);

      if (versionLine) {
        return versionLine[1];
      }
    }
  }

  fail('rust-backend/Cargo.toml [package] is missing version');
};

const readCargoLockPackageVersion = (lockfile) => {
  const packages = lockfile.split(/^\[\[package\]\]\s*$/m).slice(1);

  for (const pkg of packages) {
    if (/^name\s*=\s*"auth-mini"\s*$/m.test(pkg)) {
      const versionLine = /^version\s*=\s*"([^"]+)"\s*$/m.exec(pkg);

      if (!versionLine) {
        fail('rust-backend/Cargo.lock package auth-mini is missing version');
      }

      return versionLine[1];
    }
  }

  fail('rust-backend/Cargo.lock is missing package auth-mini');
};

const cargoTomlVersion = readTomlPackageVersion(
  readText('rust-backend/Cargo.toml'),
);
const cargoLockVersion = readCargoLockPackageVersion(
  readText('rust-backend/Cargo.lock'),
);

const expectedVersions = [
  ['package.json version', packageVersion],
  ['rust-backend/Cargo.toml [package] version', cargoTomlVersion],
  ['rust-backend/Cargo.lock auth-mini package version', cargoLockVersion],
];

for (const [label, actual] of expectedVersions) {
  if (actual !== version) {
    fail(`${label} must be ${version} for release tag ${tag}, got ${actual}`);
  }
}

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `tag=${tag}\nversion=${version}\nminor=${minor}\n`,
  );
}

console.log(`release version check passed: ${tag}`);
