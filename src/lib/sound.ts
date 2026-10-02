/** Sound for the end of a session. Uses the Web Audio API. */

let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (context) {
    return context;
  }
  if (typeof window === "undefined" || typeof window.AudioContext !== "function") {
    return null;
  }
  try {
    context = new window.AudioContext();
  } catch {
    context = null;
  }
  return context;
}

/**
 * Prepares audio playback. Call this from a user interaction, because
 * browsers block sound until the user interacts with the page.
 */
export function unlockAudio(): void {
  const audio = getContext();
  if (audio && audio.state === "suspended") {
    void audio.resume().catch(() => undefined);
  }
}

/** Plays a short two-tone chime. Does nothing if audio is not available. */
export function playChime(): void {
  const audio = getContext();
  if (!audio) {
    return;
  }
  const start = audio.currentTime;
  [880, 1320].forEach((frequency, index) => {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const toneStart = start + index * 0.2;
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, toneStart);
    gain.gain.exponentialRampToValueAtTime(0.3, toneStart + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, toneStart + 0.35);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(toneStart);
    oscillator.stop(toneStart + 0.4);
  });
}
