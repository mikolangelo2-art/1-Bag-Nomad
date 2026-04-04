import { useState, useEffect } from "react";

export function useMobile() {
  const [m, setM] = useState(window.innerWidth < 480);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 480);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}
