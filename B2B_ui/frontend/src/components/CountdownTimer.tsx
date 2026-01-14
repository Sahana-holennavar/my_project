"use client";

import React, { useEffect, useState, useRef } from 'react';

type Props = {
  duration: number;
  onExpire: () => void;
};

const CountdownTimer: React.FC<Props> = ({ duration, onExpire }) => {
  const [time, setTime] = useState(duration);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setTime(duration);
  }, [duration]);

  useEffect(() => {
    if (time <= 0) {
      onExpire();
      return;
    }
    timerRef.current = setTimeout(() => setTime(time - 1), 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [time, onExpire]);

  const minutes = Math.floor(time / 60).toString().padStart(2, '0');
  const seconds = (time % 60).toString().padStart(2, '0');
  const isWarning = time <= 60;

  return (
    <span style={{ fontWeight: 600, color: isWarning ? '#d32f2f' : '#0070f3', fontSize: 18 }}>
      {minutes}:{seconds}
      {isWarning && ' (expiring soon)'}
    </span>
  );
};

export default CountdownTimer;
