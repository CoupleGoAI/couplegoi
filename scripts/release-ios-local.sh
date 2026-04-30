#!/bin/sh

set -eu

CLEAN_PREBUILD="false"
DEVICE_NAME=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --help|-h)
      cat <<'EOF'
Usage: npm run release:ios:native
       npm run ios:release:debug

Builds and installs a local iOS Release build on a connected iPhone.

Options:
  --clean             Regenerate ios/ before building
  --no-clean          Reuse existing ios/ project
  --device <name>     Pass a specific device name or identifier to Expo

Required env in shell, .env, or .env.local:
  EXPO_PUBLIC_SUPABASE_URL
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  EXPO_PUBLIC_SUPABASE_ANON_KEY
EOF
      exit 0
      ;;
    --clean)
      CLEAN_PREBUILD="true"
      shift
      ;;
    --no-clean)
      CLEAN_PREBUILD="false"
      shift
      ;;
    --device)
      if [ "$#" -lt 2 ]; then
        echo "Missing value for --device." >&2
        exit 1
      fi
      DEVICE_NAME="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(CDPATH= cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd "$SCRIPT_DIR/.." && pwd)"
IOS_DIR="$REPO_ROOT/ios"

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

require_command() {
  NAME="$1"

  if ! command -v "$NAME" >/dev/null 2>&1; then
    echo "Missing required command: $NAME" >&2
    exit 1
  fi
}

cd "$REPO_ROOT"

load_env_file "$REPO_ROOT/.env"
load_env_file "$REPO_ROOT/.env.local"

require_env EXPO_PUBLIC_SUPABASE_URL
require_env EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
require_env EXPO_PUBLIC_SUPABASE_ANON_KEY

require_command xcodebuild
require_command xcrun
require_command pod

if [ "$(uname -s)" != "Darwin" ]; then
  echo "iOS native release builds require macOS." >&2
  exit 1
fi

if [ "$CLEAN_PREBUILD" = "true" ] || [ ! -d "$IOS_DIR" ]; then
  echo "> CI=1 npx expo prebuild --platform ios --clean"
  CI=1 npx expo prebuild --platform ios --clean
else
  echo "> CI=1 npx expo prebuild --platform ios"
  CI=1 npx expo prebuild --platform ios
fi

if [ -n "$DEVICE_NAME" ]; then
  echo "> npx expo run:ios --device $DEVICE_NAME --configuration Release"
  npx expo run:ios --device "$DEVICE_NAME" --configuration Release
else
  echo "> npx expo run:ios --device --configuration Release"
  npx expo run:ios --device --configuration Release
fi