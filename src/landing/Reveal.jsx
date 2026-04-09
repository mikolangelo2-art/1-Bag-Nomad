import { useEffect, useRef, useState } from "react";

const motionClass = {
  default: "",
  subtle: "lp-reveal--subtle",
  whisper: "lp-reveal--whisper",
};

export function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
  style,
  variant = "default",
  duration = "normal",
  threshold = 0.12,
  rootMargin = "0px 0px -8% 0px",
  ...rest
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timeoutId;
    const ob = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          timeoutId = window.setTimeout(() => setVisible(true), delay);
          ob.unobserve(el);
        }
      },
      { threshold, rootMargin }
    );
    ob.observe(el);
    return () => {
      ob.disconnect();
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [delay, threshold, rootMargin]);
  const motion = motionClass[variant] ?? "";
  const slow = duration === "slow" ? "lp-reveal--slow" : "";
  return (
    <Tag
      ref={ref}
      className={`lp-reveal ${motion} ${slow} ${visible ? "lp-reveal--visible" : ""} ${className}`.trim()}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  );
}
