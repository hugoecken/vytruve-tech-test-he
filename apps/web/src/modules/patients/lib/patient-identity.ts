/** Derives one locale-aware grapheme from each validated patient name. */
export function getPatientInitials(
  firstName: string,
  lastName: string,
  locale: string,
): string {
  const segmenter = new Intl.Segmenter(locale, { granularity: 'grapheme' });
  return `${firstGrapheme(segmenter, firstName)}${firstGrapheme(
    segmenter,
    lastName,
  )}`.toLocaleUpperCase(locale);
}

/** Selects the first user-perceived character from one validated name. */
function firstGrapheme(segmenter: Intl.Segmenter, value: string): string {
  return (
    segmenter.segment(value.trim())[Symbol.iterator]().next().value?.segment ??
    ''
  );
}
