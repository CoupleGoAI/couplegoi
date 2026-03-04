import type { TodCategory, TodType } from '../types';

// ─── ID generation ────────────────────────────────────────────────────────────
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
export function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const ts = new Date(isoString).getTime();
  const diff = now - ts;

  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export function formatTimestamp(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Game helpers ─────────────────────────────────────────────────────────────
export function getCategoryEmoji(category: TodCategory): string {
  const map: Record<TodCategory, string> = {
    romantic: '💕',
    spicy: '🔥',
    fun: '🎉',
  };
  return map[category];
}

export function getCategoryLabel(category: TodCategory): string {
  const map: Record<TodCategory, string> = {
    romantic: 'Romantic',
    spicy: 'Spicy',
    fun: 'Fun & Silly',
  };
  return map[category];
}

export function getCategoryColor(category: TodCategory): string {
  const map: Record<TodCategory, string> = {
    romantic: '#E8327A',
    spicy: '#F97316',
    fun: '#A855F7',
  };
  return map[category];
}

export function getTypeEmoji(type: TodType): string {
  return type === 'truth' ? '💭' : '⚡';
}

