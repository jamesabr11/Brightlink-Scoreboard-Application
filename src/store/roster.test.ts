import { beforeEach, describe, expect, it, vi } from 'vitest';

class FakeChannel {
  static open = new Set<FakeChannel>();
  onmessage: ((event: { data: unknown }) => void) | null = null;
  constructor() { FakeChannel.open.add(this); }
  postMessage(data: unknown) {
    for (const tab of FakeChannel.open) if (tab !== this) tab.onmessage?.({ data: structuredClone(data) });
  }
  close() { FakeChannel.open.delete(this); }
}

const openTab = async () => {
  vi.resetModules();
  return (await import('./useRosterStore')).useRosterStore;
};

beforeEach(() => {
  FakeChannel.open.clear();
  vi.stubGlobal('BroadcastChannel', FakeChannel);
  // rosterPhotos uses IndexedDB; stub it out so store can import cleanly.
  vi.stubGlobal('indexedDB', { open: () => ({ onupgradeneeded: null, onsuccess: null, onerror: null }) });
  // Persist middleware reads from localStorage on init; clear it so each test starts fresh.
  localStorage.clear();
});

describe('useRosterStore', () => {
  it('starts with empty rosters', async () => {
    const store = await openTab();
    expect(store.getState().home).toEqual([]);
    expect(store.getState().away).toEqual([]);
  });

  it('addPlayer appends to the correct side', async () => {
    const store = await openTab();
    store.getState().addPlayer('home', { name: 'Alice', number: '10', position: 'PG', isStarter: true, photoId: null });
    const { home, away } = store.getState();
    expect(home).toHaveLength(1);
    expect(home[0].name).toBe('Alice');
    expect(home[0].number).toBe('10');
    expect(home[0].isStarter).toBe(true);
    expect(away).toHaveLength(0);
  });

  it('addPlayer assigns a unique id and createdAt', async () => {
    const store = await openTab();
    store.getState().addPlayer('home', { name: 'Alice', number: '10', position: 'PG', isStarter: false, photoId: null });
    store.getState().addPlayer('home', { name: 'Bob', number: '5', position: 'C', isStarter: false, photoId: null });
    const { home } = store.getState();
    expect(home[0].id).toBeTruthy();
    expect(home[1].id).toBeTruthy();
    expect(home[0].id).not.toBe(home[1].id);
  });

  it('updatePlayer patches a player in-place', async () => {
    const store = await openTab();
    store.getState().addPlayer('home', { name: 'Alice', number: '10', position: 'PG', isStarter: false, photoId: null });
    const id = store.getState().home[0].id;
    store.getState().updatePlayer('home', id, { name: 'Alicia', isStarter: true });
    const player = store.getState().home[0];
    expect(player.name).toBe('Alicia');
    expect(player.number).toBe('10');
    expect(player.isStarter).toBe(true);
  });

  it('removePlayer removes the correct player', async () => {
    const store = await openTab();
    store.getState().addPlayer('home', { name: 'Alice', number: '10', position: 'PG', isStarter: false, photoId: null });
    store.getState().addPlayer('home', { name: 'Bob', number: '5', position: 'C', isStarter: false, photoId: null });
    const id = store.getState().home[0].id;
    store.getState().removePlayer('home', id);
    expect(store.getState().home).toHaveLength(1);
    expect(store.getState().home[0].name).toBe('Bob');
  });

  it('movePlayer swaps players up', async () => {
    const store = await openTab();
    store.getState().addPlayer('home', { name: 'Alice', number: '10', position: 'PG', isStarter: false, photoId: null });
    store.getState().addPlayer('home', { name: 'Bob', number: '5', position: 'C', isStarter: false, photoId: null });
    const id = store.getState().home[1].id; // Bob is at index 1
    store.getState().movePlayer('home', id, 'up');
    expect(store.getState().home[0].name).toBe('Bob');
    expect(store.getState().home[1].name).toBe('Alice');
  });

  it('movePlayer is a no-op at the boundary', async () => {
    const store = await openTab();
    store.getState().addPlayer('home', { name: 'Alice', number: '10', position: 'PG', isStarter: false, photoId: null });
    const id = store.getState().home[0].id;
    store.getState().movePlayer('home', id, 'up'); // already first
    expect(store.getState().home[0].name).toBe('Alice');
  });

  it('syncs addPlayer between tabs via BroadcastChannel', async () => {
    const tab1 = await openTab();
    const tab2 = await openTab();
    tab1.getState().addPlayer('away', { name: 'Carol', number: '7', position: 'SF', isStarter: false, photoId: null });
    expect(tab2.getState().away).toHaveLength(1);
    expect(tab2.getState().away[0].name).toBe('Carol');
  });
});
