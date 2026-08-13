/** Framework-independent parameters for one zero-based server page. */
export interface PageParameters {
  page: number;
  pageSize: number;
}

/** One deterministic collection page without a fabricated total. */
export interface Page<Item> extends PageParameters {
  hasNext: boolean;
  items: Item[];
}

/** TypeORM-compatible offset window with one look-ahead item. */
interface PageWindow {
  skip: number;
  take: number;
}

/**
 * Converts validated page parameters to a persistence window.
 *
 * @param parameters Validated zero-based page and bounded page size.
 * @returns Offset and one-item look-ahead bounds for the repository query.
 */
export function createPageWindow(parameters: PageParameters): PageWindow {
  return {
    skip: parameters.page * parameters.pageSize,
    take: parameters.pageSize + 1,
  };
}

/**
 * Converts a look-ahead result into the shared application page shape.
 *
 * @param items Deterministically ordered repository results containing at most one look-ahead item.
 * @param parameters Effective page parameters used for the repository query.
 * @returns The bounded page and whether another page exists.
 */
export function createPage<Item>(
  items: Item[],
  parameters: PageParameters,
): Page<Item> {
  return {
    hasNext: items.length > parameters.pageSize,
    items: items.slice(0, parameters.pageSize),
    page: parameters.page,
    pageSize: parameters.pageSize,
  };
}
