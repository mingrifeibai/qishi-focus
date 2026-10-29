import { useEffect } from 'react';
import type { AppState, Settings } from './core';
let context: AudioContext | null = null;
let source: AudioBufferSourceNode | null = null;
let gain: GainNode | null = null;
let filter: BiquadFilterNode | null = null;
let current = 'off';
export function unlockAmbient() {
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume();
  } catch {}
}
function stop() {
  source?.stop();
  source?.disconnect();
  gain?.disconnect();
  filter?.disconnect();
  source = null;
  gain = null;
  filter = null;
  current = 'off';
}
function play(kind: Settings['ambient'], volume: number) {
  if (kind === 'off') {
    stop();
    return;
  }
  unlockAmbient();
  if (!context) return;
  if (current !== kind) {
    stop();
    current = kind;
    const length = context.sampleRate * 4;
    const buffer = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let last = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = kind === 'brown' ? Math.max(-1, Math.min(1, last * 3.5)) : white;
      }
      const fade = Math.min(1024, length / 2);
      for (let i = 0; i < fade; i++) {
        data[i] *= i / fade;
        data[length - 1 - i] *= i / fade;
      }
    }
    source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    gain = context.createGain();
    gain.gain.value = 0;
    filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = kind === 'rain' ? 1700 : kind === 'brown' ? 450 : 6500;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start();
  }
  gain?.gain.setTargetAtTime(Math.pow(volume / 100, 1.5) * 0.32, context.currentTime, 0.25);
}
export function useAmbient(state: AppState | null) {
  const kind = state?.settings.ambient ?? 'off';
  const volume = state?.settings.ambientVolume ?? 30;
  const running = state?.timer.status === 'running' && state.timer.phase === 'focus';
  useEffect(() => {
    play(running ? kind : 'off', volume);
  }, [kind, volume, running]);
  useEffect(() => () => stop(), []);
}
