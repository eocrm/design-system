/**
 * Format a byte count into a human-readable string with a unit.
 *
 * Uses the 1024-based (KiB) convention internally but labels as `B`/`KB`/`MB`/
 * `GB` for consumer familiarity — the CRM presents file sizes the way Finder /
 * Explorer / Drive present them (1024 bytes = "1 KB"), not the SI 1000-base.
 *
 * Examples:
 * - `formatBytes(0)` → `"0 B"`
 * - `formatBytes(512)` → `"512 B"`
 * - `formatBytes(1024)` → `"1 KB"`
 * - `formatBytes(1536)` → `"1.5 KB"`
 * - `formatBytes(1024 * 1024 * 1.5)` → `"1.5 MB"`
 * - `formatBytes(1024 * 1024 * 1024 * 2.3)` → `"2.3 GB"`
 *
 * Bytes show as integers (no decimals). KB/MB/GB show as integers when whole,
 * otherwise one decimal place.
 *
 * Private to the FileUpload directory — not re-exported from the package.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return formatWithUnit(bytes / 1024, 'KB');
  if (bytes < 1024 * 1024 * 1024) return formatWithUnit(bytes / (1024 * 1024), 'MB');
  return formatWithUnit(bytes / (1024 * 1024 * 1024), 'GB');
}

function formatWithUnit(value: number, unit: string): string {
  // Integer when whole; one decimal otherwise. Avoids "1.0 KB" while keeping
  // "1.5 KB" / "2.3 GB" precision.
  const rounded = Math.round(value * 10) / 10;
  const display = Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
  return `${display} ${unit}`;
}
