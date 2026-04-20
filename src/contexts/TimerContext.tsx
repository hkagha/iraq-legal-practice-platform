import { createContext, useContext, ReactNode } from 'react';

interface TimerContextValue {
  isRunning: boolean;
  elapsedSeconds: number;
  startTimer: (...args: any[]) => void;
  stopTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  activeTimer: any;
}

const TimerContext = createContext<TimerContextValue>({
  isRunning: false,
  elapsedSeconds: 0,
  startTimer: () => {},
  stopTimer: () => {},
  pauseTimer: () => {},
  resumeTimer: () => {},
  activeTimer: null,
});

export const useTimer = () => useContext(TimerContext);

export function TimerProvider({ children }: { children: ReactNode }) {
  return (
    <TimerContext.Provider value={{
      isRunning: false,
      elapsedSeconds: 0,
      startTimer: () => {},
      stopTimer: () => {},
      pauseTimer: () => {},
      resumeTimer: () => {},
      activeTimer: null,
    }}>
      {children}
    </TimerContext.Provider>
  );
}
