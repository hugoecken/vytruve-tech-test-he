/** Creates a public scan label without exposing the uploaded filename. */
export function formatScanLabel(scanId: string): string {
  return `SCN-${scanId.replace(/-/g, '').slice(-6).toUpperCase()}`;
}
