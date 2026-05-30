/**
 * Web Audio API based synthesizer for premium, subtle audio alerts.
 * Bypasses need for external static media files and works flawlessly in modern browsers.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Check if sounds are currently enabled in persistent storage.
 * Defaults to true.
 */
export function isSoundEnabled(): boolean {
  try {
    const saved = localStorage.getItem('tradelens_sound_enabled');
    return saved !== 'false';
  } catch (e) {
    return true;
  }
}

/**
 * Enable or disable sounds persistently.
 */
export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem('tradelens_sound_enabled', enabled ? 'true' : 'false');
  } catch (e) {
    console.error("Failed to save sound settings:", e);
  }
}

/**
 * Play a beautiful, gentle double-beep for "Analysis Ready".
 */
export function playAnalysisReadySound() {
  if (!isSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Gain node for envelope control
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.12, now + 0.05); // low volume to keep it subtle
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    // Filter to sweeten the tone
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);

    // Twin oscillators for warm additive tone
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();

    // Harmonic frequency - high-grade synth sound (C5 and E5)
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5 (staggered for sweet chord arpeggio)

    osc1.type = 'sine';
    osc2.type = 'sine';

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(filter);
    filter.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.4);

    osc2.start(now + 0.08);
    osc2.stop(now + 0.6);
  } catch (error) {
    console.warn("Audio Context alert blocked/failed:", error);
  }
}

/**
 * Play a delicate upward message chime for a support message alert.
 */
export function playMessageAlertSound() {
  if (!isSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.08, now + 0.02); // very light, ambient
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    
    // Smooth pitch sweep up: 587.33 Hz (D5) -> 880Hz (A5)
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.15);

    osc.connect(gainNode);
    gainNode.connect(filter);
    filter.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  } catch (error) {
    console.warn("Audio Context alert blocked/failed:", error);
  }
}
