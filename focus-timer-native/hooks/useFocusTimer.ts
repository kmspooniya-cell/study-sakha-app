import { useEffect, useRef, useState } from 'react';
import { remainingSecondsAt } from '../utils/timer';

export type SessionPreset = { label: string; minutes: number };
export const SESSION_PRESETS: SessionPreset[] = [
  { label: 'ras • Active session', minutes: 25 },
  { label: 'Deep Focus', minutes: 50 },
  { label: 'Quick Sprint', minutes: 15 },
  { label: 'Evening Study', minutes: 45 },
];

export function useFocusTimer(onComplete: (isBreak: boolean) => void) {
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(24 * 60 + 57);
  const [running, setRunning] = useState(true);
  const [isBreak, setIsBreak] = useState(false);
  const [sessionLabel, setSessionLabel] = useState(SESSION_PRESETS[0].label);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!running) return;
    const deadline = Date.now() + remainingSeconds * 1000;
    const interval = setInterval(() => {
      const next = remainingSecondsAt(deadline, Date.now());
      setRemainingSeconds(next);
      if (next === 0) {
        setRunning(false);
        onCompleteRef.current(isBreak);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [isBreak, remainingSeconds, running]);

  const reset = (start = true) => {
    setIsBreak(false);
    setTotalSeconds(25 * 60);
    setRemainingSeconds(25 * 60);
    setRunning(start);
  };

  const togglePause = () => {
    if (remainingSeconds === 0) setRemainingSeconds(totalSeconds);
    setRunning((value) => !value);
  };

  const toggleBreak = () => {
    const nextBreak = !isBreak;
    setIsBreak(nextBreak);
    setTotalSeconds(nextBreak ? 5 * 60 : 25 * 60);
    setRemainingSeconds(nextBreak ? 5 * 60 : 25 * 60);
    setRunning(true);
  };

  const selectPreset = (preset: SessionPreset) => {
    setSessionLabel(preset.label);
    setIsBreak(false);
    setTotalSeconds(preset.minutes * 60);
    setRemainingSeconds(preset.minutes * 60);
    setRunning(true);
  };

  return {
    totalSeconds,
    remainingSeconds,
    running,
    isBreak,
    sessionLabel,
    setSessionLabel,
    reset,
    togglePause,
    toggleBreak,
    selectPreset,
  };
}