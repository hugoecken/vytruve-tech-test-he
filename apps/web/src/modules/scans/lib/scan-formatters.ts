/** Creates a public scan label without exposing the uploaded filename. */
export function formatScanLabel(scanId: string): string {
  return `SCN-${scanId.replace(/-/g, '').slice(-6).toUpperCase()}`;
}

/** Formats scan bytes as a compact binary size for the active locale. */
export function formatScanFileSize(bytes: number, language: string): string {
  if (bytes < 1024 * 1024) {
    const kibibytes = bytes / 1024;
    return `${formatSize(kibibytes, language)} KiB`;
  }

  const mebibytes = bytes / (1024 * 1024);
  return `${formatSize(mebibytes, language)} MiB`;
}

function formatSize(value: number, language: string): string {
  return new Intl.NumberFormat(language, {
    maximumFractionDigits: 1,
  }).format(value);
}
