class SoundManager {
  private context: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.context) {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.context;
  }

  public playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
    try {
      const ctx = this.getContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.error('Error playing sound:', e);
    }
  }

  public playTick() {
    this.playTone(800, 0.1);
  }

  public playTock() {
    this.playTone(600, 0.1);
  }

  public playAlarm() {
    try {
      const ctx = this.getContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;
      // Play 3 beeps
      [0, 0.3, 0.6].forEach(offset => {
        this.playToneAt(1000, 0.15, now + offset, 'square');
      });
    } catch (e) {
      console.error('Error playing alarm:', e);
    }
  }

  private playToneAt(frequency: number, duration: number, startTime: number, type: OscillatorType = 'sine') {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, startTime);

      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch (e) {
       console.error('Error playing sound:', e);
    }
  }
}

export const soundManager = new SoundManager();
