import { useEffect, useRef, useState } from "react";

export function Reveal({ children, className = "", delay = 0, as: Tag = "div", style, ...rest }) {
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
      { threshold: 0.12, rootMargin: "0px 0px -5% 0px" }
    );
    ob.observe(el);
    return () => {
      ob.disconnect();
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [delay]);
  return (
    <Tag
      ref={ref}
      className={`lp-reveal ${visible ? "lp-reveal--visible" : ""} ${className}`.trim()}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  );
}
