import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/preact';
import { PosterSvg } from '../../src/games/gawa-ko-to/Poster';
import { EMPTY_POSTER, type Brief } from '../../src/games/gawa-ko-to/rules';

afterEach(cleanup);

const brief = (neighborSays: 'yes' | 'no'): Brief => ({ n: 1, topic: 'dengue', requirements: [], neighborSays, seconds: null });
const asked = { ...EMPTY_POSTER, picture: 'neighbor' as const, asked: true };

describe('Gawa poster footer', () => {
  it('prints "with permission" only when the neighbour said yes', () => {
    const yes = render(<PosterSvg poster={asked} brief={brief('yes')} id="yes" />);
    expect(yes.container.textContent).toContain('with permission');
    cleanup();
    const no = render(<PosterSvg poster={asked} brief={brief('no')} id="no" />);
    expect(no.container.textContent).not.toContain('with permission');
  });
});
