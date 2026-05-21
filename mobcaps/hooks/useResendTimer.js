import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useResendTimer
 * A reusable hook that manages a countdown timer for "Resend Code" buttons.
 *
 * @param {number} duration - Countdown duration in seconds (default: 60)
 * @returns {{ timeLeft: number, isActive: boolean, startTimer: () => void }}
 *
 * Usage:
 *   const { timeLeft, isActive, startTimer } = useResendTimer(60);
 *   // Call startTimer() immediately after the code is sent.
 *   // While isActive is true, the button should be disabled and show `Resend code in Xs`.
 *   // When isActive becomes false, the user can press resend again.
 */
export function useResendTimer(duration = 60) {
  const [timeLeft, setTimeLeft] = useState(0);
  const intervalRef = useRef(null);

  // Clear the running interval
  const stopTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Start (or restart) the countdown from `duration`
  const startTimer = useCallback(() => {
    stopTimer();
    setTimeLeft(duration);

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [duration, stopTimer]);

  // Stop the interval when the component that uses this hook unmounts
  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  return {
    timeLeft,
    isActive: timeLeft > 0,
    startTimer,
  };
}
