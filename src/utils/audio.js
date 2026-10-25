let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// play short tone
export function playTone(freq, type = 'sine', duration = 0.1, volume = 0.1) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn("Audio play failed:", e);
  }
}

// confirmation beep
export function playChirp() {
  playTone(880, 'sine', 0.05, 0.04);
  setTimeout(() => {
    playTone(1320, 'sine', 0.08, 0.04);
  }, 50);
}

// hover tick
export function playTick() {
  playTone(1600, 'sine', 0.015, 0.01);
}

export function playClick() {
  playTone(880, 'triangle', 0.07, 0.07);
}

// warning sound
export function playWarning() {
  playTone(220, 'sawtooth', 0.15, 0.06);
  setTimeout(() => {
    playTone(180, 'sawtooth', 0.25, 0.06);
  }, 120);
}

// error sound
export function playError() {
  playTone(150, 'sawtooth', 0.3, 0.08);
}

// success chord
export function playSuccess() {
  playTone(523.25, 'sine', 0.15, 0.03); // C5
  setTimeout(() => playTone(659.25, 'sine', 0.15, 0.03), 80); // E5
  setTimeout(() => playTone(783.99, 'sine', 0.2, 0.03), 160); // G5
  setTimeout(() => playTone(1046.50, 'sine', 0.3, 0.03), 240); // C6
}

// Sirens/Alarm (e.g. self-destruct or red alert)
let alarmInterval = null;
let alarmOsc = null;

export function startAlarm() {
  try {
    stopAlarm();
    const ctx = getAudioContext();
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.04, ctx.currentTime);
    gainNode.connect(ctx.destination);

    alarmOsc = ctx.createOscillator();
    alarmOsc.type = 'sawtooth';
    alarmOsc.frequency.setValueAtTime(220, ctx.currentTime);
    alarmOsc.connect(gainNode);

    const sweep = () => {
      if (!ctx || ctx.state === 'closed') return;
      const now = ctx.currentTime;
      alarmOsc.frequency.setValueAtTime(220, now);
      alarmOsc.frequency.linearRampToValueAtTime(440, now + 0.4);
      alarmOsc.frequency.linearRampToValueAtTime(220, now + 0.8);
    };

    sweep();
    const interval = setInterval(sweep, 800);
    
    alarmOsc.start();
    
    alarmInterval = {
      stop: () => {
        clearInterval(interval);
        try {
          alarmOsc.stop();
        } catch {}
      }
    };
  } catch (e) {
    console.warn("Alarm start failed:", e);
  }
}

export function stopAlarm() {
  if (alarmInterval) {
    alarmInterval.stop();
    alarmInterval = null;
  }
}

// Background Drone Engine Hum (V1 background track)
let droneGain = null;
let droneOsc1 = null;
let droneOsc2 = null;

export function startDrone() {
  try {
    if (droneOsc1) return; // already running
    const ctx = getAudioContext();
    
    droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.015, ctx.currentTime); // very subtle
    
    droneOsc1 = ctx.createOscillator();
    droneOsc1.type = 'sine';
    droneOsc1.frequency.setValueAtTime(55, ctx.currentTime); // Low A1
    
    droneOsc2 = ctx.createOscillator();
    droneOsc2.type = 'triangle';
    droneOsc2.frequency.setValueAtTime(110, ctx.currentTime); // Low A2
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, ctx.currentTime);
    
    droneOsc1.connect(filter);
    droneOsc2.connect(filter);
    filter.connect(droneGain);
    droneGain.connect(ctx.destination);
    
    droneOsc1.start();
    droneOsc2.start();
  } catch (e) {
    console.warn("Drone play failed:", e);
  }
}

export function stopDrone() {
  try {
    if (droneOsc1) {
      droneOsc1.stop();
      droneOsc1 = null;
    }
    if (droneOsc2) {
      droneOsc2.stop();
      droneOsc2 = null;
    }
    if (droneGain) {
      droneGain.disconnect();
      droneGain = null;
    }
  } catch {}
}

