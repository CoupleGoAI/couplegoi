import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const COMMIT_MESSAGE = process.env.COMMIT_MESSAGE ?? '';
const RELEASE_TYPE_INPUT = process.env.RELEASE_TYPE_INPUT ?? '';
const outputPath = process.env.GITHUB_OUTPUT;

const releaseTypeFromInput = RELEASE_TYPE_INPUT.match(/^(patch|minor|major)$/i);

const explicitReleaseMatch =
  releaseTypeFromInput ??
  COMMIT_MESSAGE.match(/\[release:android:(patch|minor|major)\]/i) ??
  COMMIT_MESSAGE.match(/release\(android\):\s*(patch|minor|major)/i);

if (!explicitReleaseMatch) {
  writeOutputs({
    should_release: 'false',
  });
  process.exit(0);
}

const bumpType = explicitReleaseMatch[1].toLowerCase();

const appJsonPath = new URL('../app.json', import.meta.url);
const packageJsonPath = new URL('../package.json', import.meta.url);

const appJson = JSON.parse(readFileSync(appJsonPath, 'utf8'));
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

const currentVersion = String(appJson.expo?.version ?? packageJson.version ?? '1.0.0');
const nextVersion = bumpVersion(currentVersion, bumpType);
const currentVersionCode = Number(appJson.expo?.android?.versionCode ?? 0);
const nextVersionCode = currentVersionCode + 1;

execFileSync('npm', ['version', nextVersion, '--no-git-tag-version'], {
  stdio: 'inherit',
});

const updatedAppJson = JSON.parse(readFileSync(appJsonPath, 'utf8'));
updatedAppJson.expo.version = nextVersion;
updatedAppJson.expo.android = {
  ...(updatedAppJson.expo.android ?? {}),
  versionCode: nextVersionCode,
};

writeFileSync(appJsonPath, `${JSON.stringify(updatedAppJson, null, 2)}\n`);

writeOutputs({
  should_release: 'true',
  release_type: bumpType,
  version: nextVersion,
  version_code: String(nextVersionCode),
  tag: `android-v${nextVersion}`,
  release_name: `Android v${nextVersion}`,
  release_commit_message: `chore(release): android v${nextVersion} [skip ci]`,
});

function bumpVersion(version, bump) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);

  if (!match) {
    throw new Error(
      `Expected expo.version to use semver (x.y.z), received "${version}".`
    );
  }

  const [, majorRaw, minorRaw, patchRaw] = match;
  const major = Number(majorRaw);
  const minor = Number(minorRaw);
  const patch = Number(patchRaw);

  if (bump === 'major') {
    return `${major + 1}.0.0`;
  }

  if (bump === 'minor') {
    return `${major}.${minor + 1}.0`;
  }

  return `${major}.${minor}.${patch + 1}`;
}

function writeOutputs(values) {
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`);

  if (outputPath) {
    writeFileSync(outputPath, `${lines.join('\n')}\n`, { flag: 'a' });
  }

  for (const line of lines) {
    console.log(line);
  }
}
