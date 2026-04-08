import * as FileSystem from 'expo-file-system';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_DIR = `${FileSystem.documentDirectory ?? ''}logs/`;
const LOG_FILE = `${LOG_DIR}app.log`;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB — rotate after this

let dirReady = false;
let writeQueue: Promise<void> = Promise.resolve();

function ts(): string {
  return new Date().toISOString();
}

function format(
  level: LogLevel,
  tag: string,
  message: string,
  meta?: Record<string, unknown>,
): string {
  const base = `[${ts()}] ${level.toUpperCase()} [${tag}] ${message}`;
  if (meta && Object.keys(meta).length > 0) {
    return `${base} ${JSON.stringify(meta)}\n`;
  }
  return `${base}\n`;
}

async function ensureDir(): Promise<void> {
  if (dirReady) return;
  const info = await FileSystem.getInfoAsync(LOG_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(LOG_DIR, { intermediates: true });
  }
  dirReady = true;
}

async function rotateIfNeeded(): Promise<void> {
  const info = await FileSystem.getInfoAsync(LOG_FILE);
  if (info.exists && info.size && info.size > MAX_FILE_SIZE) {
    const backup = `${LOG_DIR}app.prev.log`;
    const backupInfo = await FileSystem.getInfoAsync(backup);
    if (backupInfo.exists) {
      await FileSystem.deleteAsync(backup, { idempotent: true });
    }
    await FileSystem.moveAsync({ from: LOG_FILE, to: backup });
  }
}

async function appendLine(line: string): Promise<void> {
  try {
    await ensureDir();
    await rotateIfNeeded();
    const info = await FileSystem.getInfoAsync(LOG_FILE);
    if (!info.exists) {
      await FileSystem.writeAsStringAsync(LOG_FILE, line);
    } else {
      const existing = await FileSystem.readAsStringAsync(LOG_FILE);
      await FileSystem.writeAsStringAsync(LOG_FILE, existing + line);
    }
  } catch {
    // Logging must never crash the app
  }
}

function enqueue(line: string): void {
  writeQueue = writeQueue.then(() => appendLine(line));
}

function push(level: LogLevel, tag: string, message: string, meta?: Record<string, unknown>): void {
  const line = format(level, tag, message, meta);

  // Write to file
  enqueue(line);

  // Also print to console in dev
  if (__DEV__) {
    const trimmed = line.trimEnd();
    switch (level) {
      case 'error':
        // eslint-disable-next-line no-console
        console.error(trimmed);
        break;
      case 'warn':
        // eslint-disable-next-line no-console
        console.warn(trimmed);
        break;
      default:
        // eslint-disable-next-line no-console
        console.log(trimmed);
        break;
    }
  }
}

export const log = {
  debug: (tag: string, message: string, meta?: Record<string, unknown>): void =>
    push('debug', tag, message, meta),
  info: (tag: string, message: string, meta?: Record<string, unknown>): void =>
    push('info', tag, message, meta),
  warn: (tag: string, message: string, meta?: Record<string, unknown>): void =>
    push('warn', tag, message, meta),
  error: (tag: string, message: string, meta?: Record<string, unknown>): void =>
    push('error', tag, message, meta),

  /** Read the full log file */
  async readAll(): Promise<string> {
    try {
      const info = await FileSystem.getInfoAsync(LOG_FILE);
      if (!info.exists) return '';
      return FileSystem.readAsStringAsync(LOG_FILE);
    } catch {
      return '';
    }
  },

  /** Clear all log files */
  async clear(): Promise<void> {
    try {
      await FileSystem.deleteAsync(LOG_FILE, { idempotent: true });
      await FileSystem.deleteAsync(`${LOG_DIR}app.prev.log`, { idempotent: true });
    } catch {
      // ignore
    }
  },

  /** Get the log file path (for sharing/export) */
  filePath: LOG_FILE,
};
