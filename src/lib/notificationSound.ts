// Notification sound utility using Web Audio API
// Creates a pleasant notification chime without external files

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

export function playNotificationSound(type: "info" | "warning" | "critical" | "commission" = "warning") {
  try {
    const ctx = getAudioContext();
    
    // Resume context if suspended (required for autoplay policies)
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;
    
    // Configure sound based on type
    const config = {
      info: { frequencies: [523.25, 659.25], duration: 0.15, volume: 0.3 },
      warning: { frequencies: [440, 554.37, 659.25], duration: 0.12, volume: 0.4 },
      critical: { frequencies: [440, 440, 554.37, 659.25], duration: 0.1, volume: 0.5 },
      commission: { frequencies: [523.25, 659.25, 783.99, 1046.50], duration: 0.12, volume: 0.35 }, // Pleasant chime for money
    }[type];

    config.frequencies.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(freq, now);

      const startTime = now + index * config.duration;
      const endTime = startTime + config.duration;

      // Envelope for smooth sound
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(config.volume, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);

      oscillator.start(startTime);
      oscillator.stop(endTime + 0.1);
    });
  } catch (error) {
    console.warn("Could not play notification sound:", error);
  }
}

// Check if sound is enabled (stored in localStorage)
export function isSoundEnabled(): boolean {
  const stored = localStorage.getItem("notification-sound");
  return stored !== "disabled";
}

export function setSoundEnabled(enabled: boolean): void {
  localStorage.setItem("notification-sound", enabled ? "enabled" : "disabled");
}

// Specific for ambassador notifications
export function isAmbassadorSoundEnabled(): boolean {
  const stored = localStorage.getItem("ambassador-notification-sound");
  return stored !== "disabled";
}

export function setAmbassadorSoundEnabled(enabled: boolean): void {
  localStorage.setItem("ambassador-notification-sound", enabled ? "enabled" : "disabled");
}
