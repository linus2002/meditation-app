import { afterEach, describe, expect, it } from 'vitest';

import { bundledContent, content, replaceContent, type Content } from '@/content';
import { getMeditation, meditations } from '@/data/meditations';
import { getProgram } from '@/data/programs';
import { searchLibrary } from '@/lib/search';

/** A deep copy of the built-in content to edit, the way a fresh fetch from Sanity would differ. */
const edited = (change: (copy: Content) => void): Content => {
  const copy = JSON.parse(JSON.stringify(bundledContent)) as Content;
  change(copy);
  return copy;
};

const first = bundledContent.meditations.find((item) => item.inLibrary !== false)!;

afterEach(() => {
  replaceContent(bundledContent);
});

describe('replaceContent', () => {
  it('shows an edited title everywhere the session appears', () => {
    const ok = replaceContent(
      edited((copy) => {
        copy.meditations.find((item) => item.id === first.id)!.title = 'Renamed In Sanity';
      }),
    );
    expect(ok).toBe(true);
    expect(getMeditation(first.id)?.title).toBe('Renamed In Sanity');
    expect(meditations.find((item) => item.id === first.id)?.title).toBe('Renamed In Sanity');
    expect(searchLibrary('renamed in sanity').meditations.map((item) => item.id)).toContain(first.id);
  });

  it('swaps in a new image and a new recording', () => {
    replaceContent(
      edited((copy) => {
        const item = copy.meditations.find((m) => m.id === first.id)!;
        item.image = { ...item.image, src: 'https://cdn.sanity.io/images/x/y/new.jpg' };
        item.recording = { src: 'https://cdn.sanity.io/files/x/y/new.mp3', duration: 321 };
      }),
    );
    const session = getMeditation(first.id)!;
    expect(session.image.src).toBe('https://cdn.sanity.io/images/x/y/new.jpg');
    expect(session.track).toBe('https://cdn.sanity.io/files/x/y/new.mp3');
    expect(session.durationSeconds).toBe(321);
  });

  it('keeps programmes pointing at the updated sessions', () => {
    const program = bundledContent.programs[0];
    replaceContent(
      edited((copy) => {
        copy.meditations.find((item) => item.id === program.sessionIds[0])!.title = 'Updated Session';
      }),
    );
    expect(getProgram(program.id)?.sessions[0].title).toBe('Updated Session');
  });

  it('holds back a session added after this build, which has no page here yet', () => {
    replaceContent(
      edited((copy) => {
        copy.meditations.push({ ...first, id: 'brand-new-session', title: 'Brand New' });
        copy.programs[0].sessionIds.push('brand-new-session');
      }),
    );
    expect(getMeditation('brand-new-session')).toBeUndefined();
    expect(getProgram(bundledContent.programs[0].id)?.sessions.map((s) => s.id)).not.toContain('brand-new-session');
  });

  it('refuses a broken copy and keeps the current content', () => {
    const before = content;
    expect(replaceContent({ ...bundledContent, meditations: [] })).toBe(false);
    expect(replaceContent(null as unknown as Content)).toBe(false);
    expect(content).toBe(before);
    expect(getMeditation(first.id)?.title).toBe(first.title);
  });
});
