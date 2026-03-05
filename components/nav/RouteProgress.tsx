'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

function isMotionDisabled() {
  if (typeof document === 'undefined') return false;
  if (document.documentElement.getAttribute('data-motion') === 'off') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function RouteProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [motionDisabled, setMotionDisabled] = useState(false);

  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRef = useRef(false);

  useEffect(() => {
    setMotionDisabled(isMotionDisabled());
  }, [pathname]);

  useEffect(() => {
    if (motionDisabled) return;

    const clearTimers = () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
      showTimerRef.current = null;
      settleTimerRef.current = null;
      tickRef.current = null;
    };

    const start = () => {
      if (pendingRef.current) return;
      pendingRef.current = true;
      clearTimers();
      setProgress(8);
      showTimerRef.current = setTimeout(() => {
        setVisible(true);
      }, 140);
      tickRef.current = setInterval(() => {
        setProgress((prev) => Math.min(86, prev + Math.max(1, (86 - prev) * 0.16)));
      }, 180);
    };

    const complete = () => {
      if (!pendingRef.current) return;
      pendingRef.current = false;
      clearTimers();
      setVisible(true);
      setProgress(100);
      settleTimerRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 180);
    };

    const onStart = () => start();
    const onReady = () => complete();
    const onPop = () => start();

    window.addEventListener('cv:navigation-start', onStart);
    window.addEventListener('cv:page-ready', onReady);
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('cv:navigation-start', onStart);
      window.removeEventListener('cv:page-ready', onReady);
      window.removeEventListener('popstate', onPop);
      clearTimers();
    };
  }, [motionDisabled]);

  if (motionDisabled || !visible) return null;

  return (
    <div className='route-progress' aria-hidden='true' data-testid='route-progress' style={{ width: `${progress}%` }} />
  );
}
