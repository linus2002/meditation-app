import { beforeEach, describe, expect, it } from 'vitest';

import { accountIn, prepareStorage, scopeOf, scopedKey } from '@/lib/account-scope';

class MemoryStorage {
  data = new Map<string, string>();
  /** Set to make the next write fail, as a full store would. */
  full = false;
  getItem = (key: string) => this.data.get(key) ?? null;
  removeItem = (key: string) => void this.data.delete(key);
  setItem = (key: string, value: string) => {
    if (this.full) {
      this.full = false;
      throw new Error('QuotaExceededError');
    }
    this.data.set(key, value);
  };
}

const STATE = 'serenity.state.v1';
const anna = scopeOf({ id: 'anna', email: 'anna@example.test' });
const ben = scopeOf({ id: 'ben', email: 'ben@example.test' });

let storage: MemoryStorage;
beforeEach(() => {
  storage = new MemoryStorage();
});

const open = (scope: typeof anna, accounts = true) => prepareStorage(storage, scope, accounts);
const stateFor = (scope: typeof anna) => storage.getItem(scopedKey(STATE, scope));
const diary = JSON.stringify({ name: 'Anna', reflections: [{ answer: 'mine' }] });

describe('who an account is', () => {
  it('counts anonymous and signed-out readers as guests', () => {
    expect(scopeOf(null)).toBe('guest');
    expect(scopeOf({ id: 'x', is_anonymous: true, email: '' })).toBe('guest');
  });

  it('keeps knowing the account when its token has expired', () => {
    const raw = JSON.stringify({
      expires_at: 1,
      user: { id: 'anna', email: 'anna@example.test', user_metadata: { first_name: 'Anna' } },
    });
    expect(accountIn(raw)).toEqual({ id: 'anna', email: 'anna@example.test', firstName: 'Anna' });
  });

  it('reads damage as signed out', () => {
    expect(accountIn('{not json')).toBeNull();
    expect(accountIn(null)).toBeNull();
  });
});

describe('a shared phone', () => {
  it('gives each account and the guest a store of their own', () => {
    expect(new Set([scopedKey(STATE, anna), scopedKey(STATE, ben), scopedKey(STATE, 'guest')]).size).toBe(3);
  });

  it('shows nothing of the last account to a guest or the next account', () => {
    open(anna);
    storage.setItem(scopedKey(STATE, anna), diary);
    open('guest');
    expect(stateFor('guest')).toBeNull();
    open(ben);
    expect(stateFor(ben)).toBeNull();
    open(anna);
    expect(stateFor(anna)).toBe(diary);
  });

  it('carries what a guest did into the first account on the phone', () => {
    const guest = JSON.stringify({ favorites: ['open-heart'] });
    storage.setItem(scopedKey(STATE, 'guest'), guest);
    open(anna);
    expect(stateFor(anna)).toBe(guest);
    expect(stateFor('guest')).toBeNull();
  });

  it('does not hand a later guest’s things to the next account', () => {
    open(anna);
    storage.setItem(scopedKey(STATE, 'guest'), JSON.stringify({ favorites: ['ocean-drift'] }));
    open(ben);
    expect(stateFor(ben)).toBeNull();
  });
});

describe('data saved before accounts had their own stores', () => {
  beforeEach(() => storage.setItem(STATE, diary));

  it('goes to whoever is signed in', () => {
    open(anna);
    expect(stateFor(anna)).toBe(diary);
    expect(storage.getItem(STATE)).toBeNull();
  });

  it('goes to the account it last synced with, not to whoever is here now', () => {
    storage.setItem('serenity.sync-owner', 'anna');
    open(ben);
    expect(stateFor(ben)).toBeNull();
    expect(stateFor(anna)).toBe(diary);
  });

  it('is set aside, not shown or erased, when nobody can be named as its owner', () => {
    open('guest');
    expect(stateFor('guest')).toBeNull();
    expect(stateFor('unclaimed')).toBe(diary);
    open(ben);
    expect(stateFor(ben)).toBeNull();
  });

  it('sets aside a private chat even with an empty profile', () => {
    storage.removeItem(STATE);
    const chat = JSON.stringify([{ id: 'welcome' }, { id: 'you-1', text: 'private' }]);
    storage.setItem('serenity.kapwa.v1', chat);
    open('guest');
    expect(storage.getItem(scopedKey('serenity.kapwa.v1', 'guest'))).toBeNull();
    expect(storage.getItem(scopedKey('serenity.kapwa.v1', 'unclaimed'))).toBe(chat);
  });

  it('stays with the guest when it holds nothing private', () => {
    const harmless = JSON.stringify({ favorites: ['open-heart'], onboarded: true });
    storage.setItem(STATE, harmless);
    open('guest');
    expect(stateFor('guest')).toBe(harmless);
  });

  it('stays put in a build without accounts', () => {
    open('guest', false);
    expect(stateFor('guest')).toBe(diary);
  });

  it('keeps the tour and the theme with the phone', () => {
    storage.setItem(STATE, JSON.stringify({ onboarded: true, settings: { lightMode: true }, name: 'Anna' }));
    open('guest');
    expect(JSON.parse(storage.getItem('serenity.device.v1')!)).toEqual({ onboarded: true, lightMode: true });
  });

  it('loses nothing when the write fails', () => {
    storage.setItem('serenity.sync-owner', 'anna');
    const write = storage.setItem;
    storage.setItem = (key, value) => {
      if (key === scopedKey(STATE, anna)) throw new Error('QuotaExceededError');
      write(key, value);
    };
    open(anna);
    expect(storage.getItem(STATE)).toBe(diary);

    storage.setItem = write;
    open(anna);
    expect(stateFor(anna)).toBe(diary);
  });

  it('never overwrites what is already in the account', () => {
    storage.setItem(scopedKey(STATE, anna), '{"name":"newer"}');
    open(anna);
    expect(stateFor(anna)).toBe('{"name":"newer"}');
  });

  it('can run any number of times', () => {
    open(anna);
    open(anna);
    expect(stateFor(anna)).toBe(diary);
  });
});
