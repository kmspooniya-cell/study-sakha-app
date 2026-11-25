import { describe, expect, it, jest } from '@jest/globals';
import { AudioPlayerLifecycle } from '../lib/audioPlayerLifecycle';

type FakePlayer = {
  calls: string[];
  play: () => void;
  pause: () => void;
  replace: (source: string) => void;
  release: () => void;
};

function makePlayer() {
  const player: FakePlayer = {
    calls: [],
    play() { this.calls.push('play'); },
    pause() { this.calls.push('pause'); },
    replace(source) { this.calls.push(`replace:${source}`); },
    release() { this.calls.push('release'); },
  };
  const onError = jest.fn<(error: unknown) => void>();
  return { player, onError, lifecycle: new AudioPlayerLifecycle(player, onError) };
}

describe('hook-owned audio player lifecycle', () => {
  it('does not issue teardown pause after the owner closes', () => {
    const { player, lifecycle } = makePlayer();
    lifecycle.run((owned) => owned.play());
    lifecycle.close();

    expect(lifecycle.run((owned) => owned.pause())).toBe(false);
    expect(player.calls).toEqual(['play']);
  });

  it('allows source switching without replacing the native player handle', () => {
    const { player, lifecycle } = makePlayer();

    lifecycle.run((owned) => owned.replace('meditation'));
    lifecycle.run((owned) => owned.replace('offline-meditation'));

    expect(player.calls).toEqual(['replace:meditation', 'replace:offline-meditation']);
    expect(player.calls.filter((call) => call === 'release')).toHaveLength(0);
  });

  it('makes repeated cleanup idempotent and blocks late async callbacks', async () => {
    const { player, lifecycle } = makePlayer();
    let resume: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => { resume = resolve; });
    const callback = pending.then(() => lifecycle.run((owned) => owned.play()));

    lifecycle.close();
    lifecycle.close();
    resume?.();
    await callback;

    expect(player.calls).toEqual([]);
  });

  it('allows pause before owner release but rejects pause after release', () => {
    const { player, lifecycle } = makePlayer();
    lifecycle.run((owned) => owned.pause());
    lifecycle.close();

    expect(lifecycle.run((owned) => owned.pause())).toBe(false);
    expect(player.calls).toEqual(['pause']);
  });

  it('reports command failures while keeping the screen owner active', () => {
    const { onError, lifecycle } = makePlayer();
    const nativeError = new Error('native audio operation failed');

    expect(lifecycle.run(() => { throw nativeError; })).toBe(false);
    expect(onError).toHaveBeenCalledWith(nativeError);
    expect(lifecycle.isActive).toBe(true);
  });

  it('blocks stale Focus player operations across rapid three-screen navigation', () => {
    const screens = [makePlayer(), makePlayer(), makePlayer()];
    screens[0].lifecycle.run((player) => player.play());
    screens[0].lifecycle.close();
    screens[1].lifecycle.run((player) => player.play());
    screens[1].lifecycle.close();
    screens[2].lifecycle.run((player) => player.play());
    screens[0].lifecycle.run((player) => player.pause());

    expect(screens.map(({ player }) => player.calls)).toEqual([['play'], ['play'], ['play']]);
  });

  it('uses a fresh owner on repeated Focus Center and Dashboard navigation', () => {
    const firstFocus = makePlayer();
    firstFocus.lifecycle.run((player) => player.play());
    firstFocus.lifecycle.close();
    const secondFocus = makePlayer();
    secondFocus.lifecycle.run((player) => player.play());
    firstFocus.lifecycle.run((player) => player.pause());

    expect(firstFocus.player.calls).toEqual(['play']);
    expect(secondFocus.player.calls).toEqual(['play']);
  });

  it('pauses before Focus completion and does not pause again during unmount', () => {
    const focusMusic = makePlayer();
    focusMusic.lifecycle.run((player) => player.play());
    focusMusic.lifecycle.run((player) => player.pause());
    focusMusic.lifecycle.close();
    focusMusic.lifecycle.run((player) => player.pause());

    expect(focusMusic.player.calls).toEqual(['play', 'pause']);
  });

  it('keeps Focus audio independent when Group Hall exits to Focus Center', () => {
    const groupHall = makePlayer();
    const focusCenter = makePlayer();
    groupHall.lifecycle.run((player) => player.play());
    focusCenter.lifecycle.run((player) => player.play());
    groupHall.lifecycle.close();
    groupHall.lifecycle.run((player) => player.pause());
    focusCenter.lifecycle.run((player) => player.pause());

    expect(groupHall.player.calls).toEqual(['play']);
    expect(focusCenter.player.calls).toEqual(['play', 'pause']);
  });

  it('preserves the Group Hall owner through Focus Center and back', () => {
    const groupHall = makePlayer();
    const focusCenter = makePlayer();
    groupHall.lifecycle.run((player) => player.play());
    focusCenter.lifecycle.run((player) => player.play());
    focusCenter.lifecycle.close();
    groupHall.lifecycle.run((player) => player.play());

    expect(groupHall.player.calls).toEqual(['play', 'play']);
    expect(focusCenter.player.calls).toEqual(['play']);
  });

  it('does not send commands from an unmount while playback is active', () => {
    const { player, lifecycle } = makePlayer();
    lifecycle.run((owned) => owned.play());
    lifecycle.close();
    lifecycle.run((owned) => owned.pause());

    expect(player.calls).toEqual(['play']);
  });

  it('survives app background and foreground while its owner remains mounted', () => {
    const { player, lifecycle } = makePlayer();
    lifecycle.run((owned) => owned.play());
    lifecycle.run((owned) => owned.pause());
    lifecycle.run((owned) => owned.play());

    expect(player.calls).toEqual(['play', 'pause', 'play']);
    expect(lifecycle.isActive).toBe(true);
  });

  it('blocks the second command when pause and release race at teardown', () => {
    const { player, lifecycle } = makePlayer();
    lifecycle.run((owned) => owned.pause());
    lifecycle.close();
    lifecycle.run((owned) => owned.release());

    expect(player.calls).toEqual(['pause']);
  });
});
