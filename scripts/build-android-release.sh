#!/bin/sh

set -eu

while [ "$#" -gt 0 ]; do
  case "$1" in
    --help|-h)
      cat <<'EOF'
Usage: npm run release:android:build

Required env in shell or .env:
  EXPO_PUBLIC_SUPABASE_URL
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  EXPO_PUBLIC_SUPABASE_ANON_KEY
  ANDROID_KEYSTORE_PASSWORD
  ANDROID_KEY_ALIAS
  ANDROID_KEY_PASSWORD

Signing source:
  ANDROID_KEYSTORE_PATH     Path to local .keystore/.jks file
  or
  ANDROID_KEYSTORE_BASE64   Base64-encoded keystore
EOF
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(CDPATH= cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd "$SCRIPT_DIR/.." && pwd)"
ANDROID_DIR="$REPO_ROOT/android"
APK_PATH="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
TEMP_KEYSTORE_PATH=""

cleanup() {
  if [ -n "$TEMP_KEYSTORE_PATH" ] && [ -f "$TEMP_KEYSTORE_PATH" ]; then
    rm -f "$TEMP_KEYSTORE_PATH"
  fi
}

trap cleanup EXIT INT TERM

load_env_file() {
  ENV_PATH="$1"

  if [ -f "$ENV_PATH" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$ENV_PATH"
    set +a
  fi
}

require_env() {
  NAME="$1"
  VALUE="$(eval "printf '%s' \"\${$NAME-}\"")"

  if [ -z "$VALUE" ]; then
    echo "Missing required env var: $NAME" >&2
    exit 1
  fi
}

decode_base64_to_file() {
  VALUE="$1"
  OUTPUT_PATH="$2"
  TMP_PATH="${OUTPUT_PATH}.tmp"

  rm -f "$TMP_PATH"

  if printf '%s' "$VALUE" | base64 --decode > "$TMP_PATH" 2>/dev/null; then
    mv "$TMP_PATH" "$OUTPUT_PATH"
    return 0
  fi

  if printf '%s' "$VALUE" | base64 -D > "$TMP_PATH"; then
    mv "$TMP_PATH" "$OUTPUT_PATH"
    return 0
  fi

  rm -f "$TMP_PATH"
  return 1
}

detect_java_home() {
  for candidate in \
    "${JAVA_HOME-}" \
    "/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
    "/opt/homebrew/opt/openjdk@17" \
    "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" \
    "/opt/homebrew/opt/openjdk@21" \
    "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
  do
    if [ -z "$candidate" ]; then
      continue
    fi

    JAVA_HOME_CANDIDATE="$candidate"
    if [ ! -x "$JAVA_HOME_CANDIDATE/bin/java" ] && [ -x "$JAVA_HOME_CANDIDATE/Contents/Home/bin/java" ]; then
      JAVA_HOME_CANDIDATE="$JAVA_HOME_CANDIDATE/Contents/Home"
    fi

    if [ ! -x "$JAVA_HOME_CANDIDATE/bin/java" ]; then
      continue
    fi

    VERSION_OUTPUT="$("$JAVA_HOME_CANDIDATE/bin/java" -version 2>&1 || true)"
    MAJOR_VERSION="$(printf '%s\n' "$VERSION_OUTPUT" | sed -n 's/.*version "\([0-9][0-9]*\).*/\1/p' | head -n 1)"

    if [ -n "$MAJOR_VERSION" ] && [ "$MAJOR_VERSION" -ge 17 ] && [ "$MAJOR_VERSION" -le 21 ]; then
      printf '%s' "$JAVA_HOME_CANDIDATE"
      return 0
    fi
  done

  return 1
}

detect_android_sdk_root() {
  for candidate in \
    "${ANDROID_SDK_ROOT-}" \
    "${ANDROID_HOME-}" \
    "$HOME/Library/Android/sdk"
  do
    if [ -n "$candidate" ] && [ -d "$candidate/platform-tools" ]; then
      printf '%s' "$candidate"
      return 0
    fi
  done

  return 1
}

cd "$REPO_ROOT"

load_env_file "$REPO_ROOT/.env"
load_env_file "$REPO_ROOT/.env.local"

if [ -f "$REPO_ROOT/.env.prod" ]; then
  cp "$REPO_ROOT/.env.prod" "$REPO_ROOT/.env.local"
  load_env_file "$REPO_ROOT/.env.local"
fi

require_env ANDROID_KEYSTORE_PASSWORD
require_env ANDROID_KEY_ALIAS
require_env ANDROID_KEY_PASSWORD
require_env EXPO_PUBLIC_SUPABASE_URL
require_env EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
require_env EXPO_PUBLIC_SUPABASE_ANON_KEY

JAVA_HOME_VALUE="$(detect_java_home || true)"
if [ -z "$JAVA_HOME_VALUE" ]; then
  echo 'Could not find a supported JDK for Android release build. Install Android Studio JBR or Homebrew openjdk@17/openjdk@21, or set JAVA_HOME to JDK 17-21.' >&2
  exit 1
fi

export JAVA_HOME="$JAVA_HOME_VALUE"
export PATH="$JAVA_HOME/bin:$PATH"
echo "Using JAVA_HOME=$JAVA_HOME"

ANDROID_SDK_ROOT_VALUE="$(detect_android_sdk_root || true)"
if [ -z "$ANDROID_SDK_ROOT_VALUE" ]; then
  echo 'Could not find the Android SDK. Set ANDROID_HOME or ANDROID_SDK_ROOT to your SDK directory.' >&2
  exit 1
fi

export ANDROID_HOME="$ANDROID_SDK_ROOT_VALUE"
export ANDROID_SDK_ROOT="$ANDROID_SDK_ROOT_VALUE"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
echo "Using ANDROID_HOME=$ANDROID_HOME"

echo "> npx expo prebuild --platform android --non-interactive --no-install --clean"
CI=1 npx expo prebuild --platform android --non-interactive --no-install --clean

printf 'sdk.dir=%s\n' "$ANDROID_HOME" > "$ANDROID_DIR/local.properties"
echo "Wrote $ANDROID_DIR/local.properties"

KEYSTORE_PATH="${ANDROID_KEYSTORE_PATH-}"
KEYSTORE_BASE64="${ANDROID_KEYSTORE_BASE64-}"

if [ -n "$KEYSTORE_PATH" ]; then
  KEYSTORE_PATH="$(cd "$(dirname "$KEYSTORE_PATH")" && pwd)/$(basename "$KEYSTORE_PATH")"
  if [ ! -f "$KEYSTORE_PATH" ]; then
    echo "ANDROID_KEYSTORE_PATH does not exist: $KEYSTORE_PATH" >&2
    exit 1
  fi
elif [ -n "$KEYSTORE_BASE64" ]; then
  mkdir -p "$ANDROID_DIR/app"
  TEMP_KEYSTORE_PATH="$ANDROID_DIR/app/release.keystore"
  decode_base64_to_file "$KEYSTORE_BASE64" "$TEMP_KEYSTORE_PATH"
  KEYSTORE_PATH="$TEMP_KEYSTORE_PATH"
else
  echo 'Provide ANDROID_KEYSTORE_PATH or ANDROID_KEYSTORE_BASE64 for release signing.' >&2
  exit 1
fi

echo "> ./gradlew assembleRelease -Pandroid.injected.signing.store.file=$KEYSTORE_PATH -Pandroid.injected.signing.store.password=*** -Pandroid.injected.signing.key.alias=$ANDROID_KEY_ALIAS -Pandroid.injected.signing.key.password=***"
(
  cd "$ANDROID_DIR"
  ./gradlew assembleRelease \
    -Pandroid.injected.signing.store.file="$KEYSTORE_PATH" \
    -Pandroid.injected.signing.store.password="$ANDROID_KEYSTORE_PASSWORD" \
    -Pandroid.injected.signing.key.alias="$ANDROID_KEY_ALIAS" \
    -Pandroid.injected.signing.key.password="$ANDROID_KEY_PASSWORD"
)

if [ ! -f "$APK_PATH" ]; then
  echo "Release APK was not created at $APK_PATH." >&2
  exit 1
fi

echo "Built release APK: $APK_PATH"
