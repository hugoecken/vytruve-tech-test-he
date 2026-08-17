/** Formats bytes as a compact binary size for the active locale. */
export function formatFileSize(bytes: number, language: string): string {
  if (bytes < 1024 * 1024) {
    return `${formatSize(bytes / 1024, language)} KiB`;
  }

  return `${formatSize(bytes / (1024 * 1024), language)} MiB`;
}

function formatSize(value: number, language: string): string {
  return new Intl.NumberFormat(language, {
    maximumFractionDigits: 1,
  }).format(value);
}
