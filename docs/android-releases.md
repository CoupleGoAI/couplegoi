# Android Releases

This repo supports Android APK releases directly from commit messages on `main`.

## What it does

- Watches pushes to `main`
- Looks for a release token in the latest commit message
- Bumps `package.json`, `package-lock.json`, and `app.json`
- Increments `expo.android.versionCode`
- Creates a git tag like `android-v1.0.1`
- Generates the native Android project with `expo prebuild`
- Builds a signed release APK with Gradle on GitHub Actions
- Publishes a GitHub Release with the APK attached

## How to trigger a release

Add a release token anywhere in the commit subject or body:

- `[release:android:patch]`
- `[release:android:minor]`
- `[release:android:major]`
- `release(android): patch`
- `release(android): minor`
- `release(android): major`

Examples:

- `fix: profile save button overlap [release:android:patch]`
- `feat: add shared prompts [release:android:minor]`
- `chore: update copy [release:android:patch]`
- `refactor: split chat state [release:android:major]`

Commits without a release token do nothing.

## One-time setup

1. Generate an Android upload keystore once and keep it safe.
2. Add these GitHub Actions secrets:
   - `ANDROID_KEYSTORE_BASE64`
   - `ANDROID_KEYSTORE_PASSWORD`
   - `ANDROID_KEY_ALIAS`
   - `ANDROID_KEY_PASSWORD`
3. If `main` is branch-protected, allow GitHub Actions to push version bump commits and tags, or swap `GITHUB_TOKEN` for a PAT with repo write access.

To create `ANDROID_KEYSTORE_BASE64`, base64-encode your keystore file and save the resulting single-line string as the secret value.

```bash
# macOS
base64 -i release.keystore | pbcopy

# Linux
base64 -w 0 release.keystore
```

## Manual local Android build

```bash
npx expo prebuild --platform android --clean --no-install
cd android
./gradlew assembleRelease
```

## Notes

- The workflow runs only on `main`.
- The release commit created by the workflow uses `[skip ci]`, so the version bump commit does not trigger another release.
- The workflow does not use Expo cloud build or `EXPO_TOKEN`.
- The APK is built entirely on GitHub Actions with Gradle.
