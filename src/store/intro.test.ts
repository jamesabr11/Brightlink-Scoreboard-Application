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
  return (await import('./useIntroStore')).useIntroStore;
};

beforeEach(() => {
  FakeChannel.open.clear();
  vi.stubGlobal('BroadcastChannel', FakeChannel);
});

describe('useIntroStore', () => {
  it('starts idle', async () => {
    const store = await openTab();
    const { team, playerIndex, isPlaying } = store.getState();
    expect(team).toBeNull();
    expect(playerIndex).toBe(-1);
    expect(isPlaying).toBe(false);
  });

  it('startIntro sets team and shows team card', async () => {
    const store = await openTab();
    store.getState().startIntro('home');
    expect(store.getState().team).toBe('home');
    expect(store.getState().playerIndex).toBe(-1);
    expect(store.getState().isPlaying).toBe(true);
  });

  it('next advances from team card to first player', async () => {
    const store = await openTab();
    store.getState().startIntro('home');
    store.getState().next(3); // 3 players
    expect(store.getState().playerIndex).toBe(0);
    expect(store.getState().isPlaying).toBe(true);
  });

  it('next through all players stops at the end', async () => {
    const store = await openTab();
    store.getState().startIntro('home');
    store.getState().next(2); // → player 0
    store.getState().next(2); // → player 1
    store.getState().next(2); // → end: isPlaying false
    expect(store.getState().isPlaying).toBe(false);
  });

  it('prev from player 0 returns to team card', async () => {
    const store = await openTab();
    store.getState().startIntro('away');
    store.getState().next(3); // → player 0
    store.getState().prev();
    expect(store.getState().playerIndex).toBe(-1);
  });

  it('prev on team card is a no-op', async () => {
    const store = await openTab();
    store.getState().startIntro('home');
    store.getState().prev(); // already at -1
    expect(store.getState().playerIndex).toBe(-1);
    expect(store.getState().isPlaying).toBe(true);
  });

  it('stop resets all state', async () => {
    const store = await openTab();
    store.getState().startIntro('home');
    store.getState().next(3);
    store.getState().stop();
    const { team, playerIndex, isPlaying } = store.getState();
    expect(team).toBeNull();
    expect(playerIndex).toBe(-1);
    expect(isPlaying).toBe(false);
  });

  it('setAutoAdvance updates ms', async () => {
    const store = await openTab();
    store.getState().setAutoAdvance(5000);
    expect(store.getState().autoAdvanceMs).toBe(5000);
  });

  it('syncs startIntro between tabs via BroadcastChannel', async () => {
    const tab1 = await openTab();
    const tab2 = await openTab();
    tab1.getState().startIntro('away');
    expect(tab2.getState().team).toBe('away');
    expect(tab2.getState().isPlaying).toBe(true);
  });

  it('next with 0 players stops immediately (no players to intro)', async () => {
    const store = await openTab();
    store.getState().startIntro('home');
    store.getState().next(0); // no players, sequence ends at team card
    expect(store.getState().isPlaying).toBe(false);
  });
});
