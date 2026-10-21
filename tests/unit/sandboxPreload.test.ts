// Background download of the sandbox model: only on Wi-Fi or an unknown (iPhone, desktop) connection, never in tests.
import { describe, expect, it } from 'vitest';
import { okToPrefetch } from '../../src/sandbox/preload';

describe('okToPrefetch', () => {
  it('downloads on Wi-Fi, ethernet, or when the browser does not say', () => {
    expect(okToPrefetch({ type: 'wifi', effectiveType: '4g' }, false)).toBe(true);
    expect(okToPrefetch({ type: 'ethernet' }, false)).toBe(true);
    expect(okToPrefetch({ effectiveType: '4g' }, false)).toBe(true); // desktop Chrome: no type
    expect(okToPrefetch(undefined, false)).toBe(true); // Safari, Firefox: no connection info
  });

  it('waits on mobile data, Data Saver and very slow links', () => {
    expect(okToPrefetch({ type: 'cellular', effectiveType: '4g' }, false)).toBe(false);
    expect(okToPrefetch({ type: 'wifi', saveData: true }, false)).toBe(false);
    expect(okToPrefetch({ type: 'wifi', effectiveType: '2g' }, false)).toBe(false);
    expect(okToPrefetch({ effectiveType: 'slow-2g' }, false)).toBe(false);
  });

  it('never downloads in an automated browser (tests)', () => {
    expect(okToPrefetch({ type: 'wifi' }, true)).toBe(false);
  });
});
