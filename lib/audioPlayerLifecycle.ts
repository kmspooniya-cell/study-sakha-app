/** Guards hook-owned expo-audio handles after their React owner unmounts. */
export class AudioPlayerLifecycle<TPlayer extends object> {
  private active = true;

  constructor(
    private readonly player: TPlayer,
    private readonly onError: (error: unknown) => void,
  ) {}

  get isActive() {
    return this.active;
  }

  run(command: (player: TPlayer) => void) {
    if (!this.active) return false;
    try {
      command(this.player);
      return true;
    } catch (error) {
      this.onError(error);
      return false;
    }
  }

  close() {
    this.active = false;
  }
}
