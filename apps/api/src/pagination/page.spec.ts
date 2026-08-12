import { createPage, createPageWindow } from './page';

describe('server pagination', () => {
  describe(createPageWindow.name, () => {
    it('requests one look-ahead row after the selected zero-based page', () => {
      const result = createPageWindow({ page: 2, pageSize: 20 });

      expect(result).toEqual({ skip: 40, take: 21 });
    });
  });

  describe(createPage.name, () => {
    it('returns a bounded page and reports an authoritative next page', () => {
      const result = createPage(['a', 'b', 'look-ahead'], {
        page: 1,
        pageSize: 2,
      });

      expect(result).toEqual({
        hasNext: true,
        items: ['a', 'b'],
        page: 1,
        pageSize: 2,
      });
    });

    it('reports the final page when no look-ahead row exists', () => {
      const result = createPage(['a', 'b'], { page: 0, pageSize: 2 });

      expect(result.hasNext).toBe(false);
      expect(result.items).toEqual(['a', 'b']);
    });
  });
});
