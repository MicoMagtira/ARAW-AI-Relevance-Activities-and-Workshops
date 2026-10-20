import { describe, expect, it } from 'vitest';
import { publicBasis } from '../../src/games/fact-or-fake/results';
import { FOF_ITEMS as ALL_ITEMS } from '../../src/content/factOrFake/items';

describe('publicBasis', () => {
  it('keeps public sources and drops the internal writing rules', () => {
    expect(publicBasis('WHO dengue fact sheet; CONTENT_GUIDE safe facts')).toBe('WHO dengue fact sheet');
    expect(publicBasis('CONTENT_GUIDE villain card')).toBeNull();
    expect(publicBasis('Data Privacy Act of 2012 (RA 10173)')).toBe('Data Privacy Act of 2012 (RA 10173)');
  });

  it('never shows an internal document name for any item', () => {
    for (const item of ALL_ITEMS) expect(publicBasis(item.basis) ?? '').not.toMatch(/CONTENT_GUIDE|SPEC/);
  });
});
