#!/bin/sh

if [ -z "${BASH_VERSION:-}" ]; then
  exec /usr/bin/env bash "$0" "$@"
fi

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  npm run release:ios:native
  npm run ios:release:debug
  sh scripts/release-ios-local.sh [options]

Builds, installs, and launches a local native iOS build on a connected iPhone.

Required:
  Provide an Apple Developer Team ID with --team-id, DEVELOPMENT_TEAM,
  APPLE_TEAM_ID, or EXPO_APPLE_TEAM_ID.

Options:
  --clean                Regenerate ios/ before building.
  --no-clean             Reuse existing ios/ project.
  --device-id ID         Physical iPhone UDID to target.
  --device-name NAME     Physical iPhone name to target.
  --team-id ID           Apple Developer Team ID for automatic signing.
  --configuration NAME   Xcode build configuration. Default: Release.
  --workspace PATH       Xcode workspace path. Defaults to the only .xcworkspace in ios/.
  --scheme NAME          Xcode scheme. Defaults to the only shared scheme in the project.
  --derived-data PATH    DerivedData path override.
  --log-file PATH        Log file path. Defaults to ~/Library/Logs/couplegoai-ios-release/couplegoai.log.
  --dry-run              Print resolved settings and commands without prebuilding or building.
  --help                 Show this help.

Notes:
  - Targets physical iPhones only.
  - Uses xcodebuild and xcrun devicectl instead of expo run:ios.
  - --device NAME is accepted as a backward-compatible alias for --device-name NAME.
EOF
}

fail() {
  echo "Error: $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

quote_args() {
  python3 - "$@" <<'PY'
import shlex
import sys

print(" ".join(shlex.quote(part) for part in sys.argv[1:]))
PY
}

resolve_workspace() {
  local project_root="$1"
  local explicit_workspace="${2:-}"
  local matches=""
  local count=""

  if [[ -n "$explicit_workspace" ]]; then
    [[ -d "$explicit_workspace" || -f "$explicit_workspace" ]] || fail "Workspace not found: $explicit_workspace"
    printf '%s\n' "$explicit_workspace"
    return 0
  fi

  matches="$(find "${project_root}/ios" -maxdepth 1 -name '*.xcworkspace' -type d -print)"
  count="$(printf '%s\n' "$matches" | sed '/^$/d' | wc -l | tr -d ' ')"

  [[ "$count" -gt 0 ]] || fail "No .xcworkspace found under ${project_root}/ios"
  [[ "$count" -eq 1 ]] || fail "Multiple .xcworkspace files found under ${project_root}/ios; pass --workspace explicitly"

  printf '%s\n' "$matches"
}

resolve_project() {
  local project_root="$1"
  local matches=""
  local count=""

  matches="$(find "${project_root}/ios" -maxdepth 1 -name '*.xcodeproj' -type d -print)"
  count="$(printf '%s\n' "$matches" | sed '/^$/d' | wc -l | tr -d ' ')"

  [[ "$count" -gt 0 ]] || fail "No .xcodeproj found under ${project_root}/ios"
  [[ "$count" -eq 1 ]] || fail "Multiple .xcodeproj files found under ${project_root}/ios"

  printf '%s\n' "$matches"
}

resolve_scheme() {
  local project_path="$1"
  local explicit_scheme="${2:-}"

  if [[ -n "$explicit_scheme" ]]; then
    printf '%s\n' "$explicit_scheme"
    return 0
  fi

  python3 - "$project_path" <<'PY'
import json
import subprocess
import sys

project_path = sys.argv[1]
data = json.loads(
    subprocess.check_output(
        ["xcodebuild", "-list", "-json", "-project", project_path],
        text=True,
    )
)
schemes = data.get("project", {}).get("schemes", [])
if len(schemes) != 1:
    raise SystemExit(
        f"Expected exactly one shared scheme in {project_path}, found {len(schemes)}; pass --scheme explicitly."
    )
print(schemes[0])
PY
}

detect_device() {
  local wanted_id="${1:-}"
  local wanted_name="${2:-}"

  python3 - "$wanted_id" "$wanted_name" <<'PY'
import json
import subprocess
import sys

wanted_id = sys.argv[1]
wanted_name = sys.argv[2].lower()

raw = subprocess.check_output(["xcrun", "xcdevice", "list"], text=True)
start = raw.find("[")
end = raw.rfind("]")
if start == -1 or end == -1:
    raise SystemExit("Unable to parse `xcrun xcdevice list` output.")

devices = json.loads(raw[start:end + 1])
physical = [
    item for item in devices
    if item.get("platform") == "com.apple.platform.iphoneos"
    and not item.get("simulator")
    and item.get("available", False)
]

if wanted_id:
    for item in physical:
        if item.get("identifier") == wanted_id:
            print(f"{item.get('identifier')}\t{item.get('name')}")
            raise SystemExit(0)
    raise SystemExit(f"Connected iPhone not found for device id: {wanted_id}")

if wanted_name:
    for item in physical:
        if item.get("name", "").lower() == wanted_name:
            print(f"{item.get('identifier')}\t{item.get('name')}")
            raise SystemExit(0)
    raise SystemExit(f"Connected iPhone not found for device name: {wanted_name}")

if not physical:
    raise SystemExit("No connected physical iPhone is available.")

chosen = physical[0]
print(f"{chosen.get('identifier')}\t{chosen.get('name')}")
PY
}

resolve_device_row() {
  local output=""

  if ! output="$(detect_device "$1" "$2" 2>&1)"; then
    fail "$output"
  fi

  printf '%s\n' "$output"
}

run_prebuild() {
  local project_root="$1"
  local clean_prebuild="$2"

  if [[ "$clean_prebuild" == "true" || ! -d "${project_root}/ios" ]]; then
    echo "> CI=1 npx expo prebuild --platform ios --clean"
    (cd "$project_root" && CI=1 npx expo prebuild --platform ios --clean)
  else
    echo "> CI=1 npx expo prebuild --platform ios"
    (cd "$project_root" && CI=1 npx expo prebuild --platform ios)
  fi

  if [[ -f "${project_root}/ios/Podfile" ]]; then
    echo "> pod install"
    (cd "${project_root}/ios" && pod install)
  fi
}

resolve_app_path() {
  local derived_data_path="$1"
  local configuration="$2"
  local app_path=""

  app_path="$(find "${derived_data_path}/Build/Products/${configuration}-iphoneos" -maxdepth 1 -name '*.app' -type d -print | head -n 1)"
  [[ -n "$app_path" ]] || fail "Built .app not found under ${derived_data_path}/Build/Products/${configuration}-iphoneos"

  printf '%s\n' "$app_path"
}

read_bundle_identifier() {
  local app_path="$1"

  /usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "${app_path}/Info.plist"
}

print_failure_summary() {
  local log_file="$1"
  local summary=""

  if [[ ! -f "$log_file" ]]; then
    echo "No build log was found." >&2
    return
  fi

  summary="$(
    python3 - "$log_file" <<'PY'
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
text = path.read_text(errors="replace")
patterns = [
    "Unable to find a destination matching",
    "No connected physical iPhone is available.",
    "Cannot create a iOS App Development provisioning profile",
    "doesn't include the App Groups capability",
    "doesn't include the Push Notifications capability",
    "doesn't support the group.",
    "The device was not found",
    "Connection failed",
    "Operation timed out",
    "Unable to install",
    "InstallApp error",
    "No Account for Team",
    "No profiles for",
    "requires a development team",
    "xcodebuild exited with error code",
    "** BUILD FAILED **",
]

matches = [
    line.strip()
    for line in text.splitlines()
    if any(pattern in line for pattern in patterns)
]

if matches:
    print("Likely cause(s):")
    for line in matches[-8:]:
        print(line)
else:
    print("Recent log tail:")
    for line in text.splitlines()[-40:]:
        print(line)
PY
  )"

  printf '%s\n' "$summary" >&2
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CLEAN_PREBUILD="false"
WORKSPACE=""
SCHEME=""
CONFIGURATION="Release"
DERIVED_DATA_PATH=""
DEVICE_ID=""
DEVICE_NAME=""
TEAM_ID="${DEVELOPMENT_TEAM:-${APPLE_TEAM_ID:-${EXPO_APPLE_TEAM_ID:-}}}"
TEAM_ID_SOURCE=""
LOG_FILE=""
DRY_RUN="false"

if [[ -n "$TEAM_ID" ]]; then
  TEAM_ID_SOURCE="environment"
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --clean)
      CLEAN_PREBUILD="true"
      shift
      ;;
    --no-clean)
      CLEAN_PREBUILD="false"
      shift
      ;;
    --device-id)
      [[ $# -ge 2 ]] || fail "--device-id requires a value"
      DEVICE_ID="$2"
      shift 2
      ;;
    --device-name|--device)
      [[ $# -ge 2 ]] || fail "$1 requires a value"
      DEVICE_NAME="$2"
      shift 2
      ;;
    --team-id)
      [[ $# -ge 2 ]] || fail "--team-id requires a value"
      TEAM_ID="$2"
      TEAM_ID_SOURCE="argument"
      shift 2
      ;;
    --configuration)
      [[ $# -ge 2 ]] || fail "--configuration requires a value"
      CONFIGURATION="$2"
      shift 2
      ;;
    --workspace)
      [[ $# -ge 2 ]] || fail "--workspace requires a value"
      WORKSPACE="$2"
      shift 2
      ;;
    --scheme)
      [[ $# -ge 2 ]] || fail "--scheme requires a value"
      SCHEME="$2"
      shift 2
      ;;
    --derived-data)
      [[ $# -ge 2 ]] || fail "--derived-data requires a value"
      DERIVED_DATA_PATH="$2"
      shift 2
      ;;
    --log-file)
      [[ $# -ge 2 ]] || fail "--log-file requires a value"
      LOG_FILE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      fail "Unknown argument: $1"
      ;;
  esac
done

if [[ "$(uname -s)" != "Darwin" ]]; then
  fail "iOS native release builds require macOS."
fi

require_cmd find
require_cmd npx
require_cmd pod
require_cmd python3
require_cmd sed
require_cmd tr
require_cmd wc
require_cmd xcodebuild
require_cmd xcrun
require_cmd /usr/libexec/PlistBuddy

[[ -f "${PROJECT_ROOT}/package.json" ]] || fail "package.json not found under: $PROJECT_ROOT"

if [[ -z "$TEAM_ID" ]]; then
  fail "Apple Developer Team ID is required. Pass --team-id, or set DEVELOPMENT_TEAM, APPLE_TEAM_ID, or EXPO_APPLE_TEAM_ID."
fi

if [[ "$DRY_RUN" != "true" ]]; then
  run_prebuild "$PROJECT_ROOT" "$CLEAN_PREBUILD"
fi

LOG_FILE="${LOG_FILE:-${HOME}/Library/Logs/couplegoai-ios-release/couplegoai.log}"
DERIVED_DATA_PATH="${DERIVED_DATA_PATH:-${HOME}/Library/Developer/Xcode/DerivedData/couplegoai-local-release}"
mkdir -p "$(dirname "$LOG_FILE")"

RESOLVED_WORKSPACE="$(resolve_workspace "$PROJECT_ROOT" "$WORKSPACE")"
RESOLVED_PROJECT="$(resolve_project "$PROJECT_ROOT")"
RESOLVED_SCHEME="$(resolve_scheme "$RESOLVED_PROJECT" "$SCHEME")"
DEVICE_ROW="$(resolve_device_row "$DEVICE_ID" "$DEVICE_NAME")"
RESOLVED_DEVICE_ID="${DEVICE_ROW%%$'\t'*}"
RESOLVED_DEVICE_NAME="${DEVICE_ROW#*$'\t'}"

BUILD_COMMAND=(
  xcodebuild
  -workspace "$RESOLVED_WORKSPACE"
  -scheme "$RESOLVED_SCHEME"
  -configuration "$CONFIGURATION"
  -destination "id=$RESOLVED_DEVICE_ID"
  -derivedDataPath "$DERIVED_DATA_PATH"
  -allowProvisioningUpdates
)
BUILD_COMMAND+=(
  DEVELOPMENT_TEAM="$TEAM_ID"
  CODE_SIGN_STYLE=Automatic
)
BUILD_COMMAND+=(build)

if [[ "$DRY_RUN" == "true" ]]; then
  echo "Project root: $PROJECT_ROOT"
  echo "Workspace: $RESOLVED_WORKSPACE"
  echo "Project: $RESOLVED_PROJECT"
  echo "Scheme: $RESOLVED_SCHEME"
  echo "Configuration: $CONFIGURATION"
  echo "DerivedData: $DERIVED_DATA_PATH"
  echo "Device: $RESOLVED_DEVICE_NAME ($RESOLVED_DEVICE_ID)"
  echo "Development team: $TEAM_ID ($TEAM_ID_SOURCE)"
  echo "Log file: $LOG_FILE"
  echo "Prebuild command: CI=1 npx expo prebuild --platform ios$([[ "$CLEAN_PREBUILD" == "true" ]] && printf ' --clean')"
  echo "Build command: $(quote_args "${BUILD_COMMAND[@]}")"
  exit 0
fi

{
  printf '\n[%s] Local iOS release started.\n' "$(date '+%Y-%m-%d %H:%M:%S')"
  printf '[%s] Project root: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$PROJECT_ROOT"
  printf '[%s] Workspace: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$RESOLVED_WORKSPACE"
  printf '[%s] Scheme: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$RESOLVED_SCHEME"
  printf '[%s] Configuration: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$CONFIGURATION"
  printf '[%s] Target device: %s (%s)\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$RESOLVED_DEVICE_NAME" "$RESOLVED_DEVICE_ID"
  printf '[%s] Development team: %s (%s)\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$TEAM_ID" "$TEAM_ID_SOURCE"
  printf '[%s] Build command: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$(quote_args "${BUILD_COMMAND[@]}")"
} >>"$LOG_FILE"

echo "> $(quote_args "${BUILD_COMMAND[@]}")"
if (cd "$PROJECT_ROOT" && "${BUILD_COMMAND[@]}") >>"$LOG_FILE" 2>&1; then
  APP_PATH="$(resolve_app_path "$DERIVED_DATA_PATH" "$CONFIGURATION")"
  BUNDLE_IDENTIFIER="$(read_bundle_identifier "$APP_PATH")"
  INSTALL_COMMAND=(xcrun devicectl --timeout 600 device install app --device "$RESOLVED_DEVICE_ID" "$APP_PATH")
  LAUNCH_COMMAND=(xcrun devicectl --timeout 60 device process launch --device "$RESOLVED_DEVICE_ID" --terminate-existing "$BUNDLE_IDENTIFIER")

  {
    printf '[%s] App bundle: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$APP_PATH"
    printf '[%s] Bundle identifier: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$BUNDLE_IDENTIFIER"
    printf '[%s] Install command: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$(quote_args "${INSTALL_COMMAND[@]}")"
  } >>"$LOG_FILE"

  echo "> $(quote_args "${INSTALL_COMMAND[@]}")"
  if "${INSTALL_COMMAND[@]}" >>"$LOG_FILE" 2>&1; then
    printf '[%s] Launch command: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$(quote_args "${LAUNCH_COMMAND[@]}")" >>"$LOG_FILE"

    echo "> $(quote_args "${LAUNCH_COMMAND[@]}")"
    if "${LAUNCH_COMMAND[@]}" >>"$LOG_FILE" 2>&1; then
      printf '[%s] Local iOS release succeeded.\n' "$(date '+%Y-%m-%d %H:%M:%S')" >>"$LOG_FILE"
      echo "Installed and launched CoupleGoAI on ${RESOLVED_DEVICE_NAME}."
      echo "Log file: $LOG_FILE"
      exit 0
    fi
  fi
fi

printf '[%s] Local iOS release failed.\n' "$(date '+%Y-%m-%d %H:%M:%S')" >>"$LOG_FILE"
echo "Local iOS release failed for ${RESOLVED_DEVICE_NAME}." >&2
echo "Log file: $LOG_FILE" >&2
print_failure_summary "$LOG_FILE"
exit 1
