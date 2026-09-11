import { describe, expect, it } from 'vitest';

import {
  characterCount,
  normaliseAnswer,
  validateAnswer,
  validateDisplayName,
} from '@/lib/circles/text';

describe('normaliseAnswer', () => {
  it('keeps an answer to one tidy line', () => {
    expect(normaliseAnswer('  letting go of \n\n  the rush  ')).toBe('letting go of the rush');
  });
});

describe('validateAnswer', () => {
  it('accepts a single line', () => {
    expect(validateAnswer('The need to reply to everything at once.')).toBeNull();
  });

  it('refuses an empty answer', () => {
    expect(validateAnswer('')).toBe('empty');
    expect(validateAnswer('   \n ')).toBe('empty');
  });

  it('holds the line at 140 characters', () => {
    expect(validateAnswer('a'.repeat(140))).toBeNull();
    expect(validateAnswer('a'.repeat(141))).toBe('too-long');
  });

  it('counts emoji as one character each, as the database does', () => {
    expect(validateAnswer('🙂'.repeat(140))).toBeNull();
    expect(characterCount('🙂🙂')).toBe(2);
  });

  it('refuses links', () => {
    expect(validateAnswer('see https://example.com')).toBe('link');
    expect(validateAnswer('www.example.com')).toBe('link');
  });
});

describe('validateDisplayName', () => {
  it('keeps names short', () => {
    expect(validateDisplayName('Maya')).toBeNull();
    expect(validateDisplayName('m'.repeat(33))).toBe('too-long');
  });
});
