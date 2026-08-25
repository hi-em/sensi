import { useEffect, useState } from "react";

// The gate's one rule. The shape space is a three-zone instrument (360px chat
// sidebar + plan viewer + 320px analysis panel), so it needs width AND height;
// a phone has neither, in either orientation. Portrait phones fail the width
// test, landscape phones fail the height one. Laptops (1280x800) fail neither
// and never see the gate, which is the point: desktop behaviour is untouched.
export const SMALL_SCREEN = "(max-width: 720px), (max-height: 500px)";

export function useIsSmallScreen() {
  const [small, setSmall] = useState(
    () => typeof window !== "undefined" && window.matchMedia(SMALL_SCREEN).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(SMALL_SCREEN);
    const onChange = (e) => setSmall(e.matches);
    mq.addEventListener("change", onChange);
    setSmall(mq.matches);   // rotation between mount and listener
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return small;
}
