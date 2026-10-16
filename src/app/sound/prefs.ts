// Sound preferences, shaped like TALA's audio controls: Music and Sound effects, each with an on/off switch and a volume.
// Defaults match TALA (music on at 25, effects on at 65). Kept apart from the a11y settings so old saved settings stay valid.
import { persisted } from '../store';

export interface SoundPrefs {
  musicOn: boolean;
  /** 0 to 100 */
  musicVolume: number;
  sfxOn: boolean;
  /** 0 to 100 */
  sfxVolume: number;
}

export const DEFAULT_SOUND: SoundPrefs = { musicOn: true, musicVolume: 25, sfxOn: true, sfxVolume: 65 };

const isVolume = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100;

export function isSoundPrefs(v: unknown): v is SoundPrefs {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.musicOn === 'boolean' && typeof o.sfxOn === 'boolean' && isVolume(o.musicVolume) && isVolume(o.sfxVolume);
}

export const soundPrefs = persisted<SoundPrefs>('sound', DEFAULT_SOUND, isSoundPrefs);

export function setSound<K extends keyof SoundPrefs>(key: K, value: SoundPrefs[K]): void {
  soundPrefs.value = { ...soundPrefs.value, [key]: value };
}

/** Perceived-loudness curve: slider 0 to 100 -> gain 0 to 1. */
export const sliderToGain = (v: number): number => (Math.max(0, Math.min(100, v)) / 100) ** 1.6;

export const effectiveGains = (p: SoundPrefs): { music: number; sfx: number } => ({
  music: p.musicOn ? sliderToGain(p.musicVolume) : 0,
  sfx: p.sfxOn ? sliderToGain(p.sfxVolume) : 0,
});
