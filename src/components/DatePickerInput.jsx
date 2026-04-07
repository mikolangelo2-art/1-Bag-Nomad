import { useRef, useCallback } from "react";

const CAL_ICON = "\uD83D\uDCC5";

function isIOSSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iP(hone|ad|od)/i.test(ua) && !ua.includes("CriOS") && !ua.includes("FxiOS");
}

/**
 * Native date field with a visible control that opens the browser date picker.
 * Global CSS hides webkit's default calendar indicator; this restores a clear affordance.
 */
function DatePickerInput({
  value,
  onChange,
  min,
  max,
  disabled,
  className,
  style,
  onFocus,
  onBlur,
  "aria-label": ariaLabel,
  icon = CAL_ICON,
  buttonStyle,
}) {
  const inputRef = useRef(null);
  const safe = value ?? "";

  const openPicker = useCallback(
    (e) => {
      e?.stopPropagation?.();
      const el = inputRef.current;
      if (!el || disabled) return;
      // iOS Safari: showPicker for type=date is still unreliable vs desktop; a direct
      // focus + click from this button tap stays in the user-gesture chain and opens the wheel UI.
      if (isIOSSafari()) {
        try {
          el.focus({ preventScroll: true });
          el.click();
        } catch {
          /* ignore */
        }
        return;
      }
      try {
        if (typeof el.showPicker === "function") el.showPicker();
        else el.click();
      } catch {
        el.focus({ preventScroll: true });
        try {
          el.click();
        } catch {
          /* ignore */
        }
      }
    },
    [disabled]
  );

  const mergedInputStyle = {
    width: "100%",
    boxSizing: "border-box",
    colorScheme: "dark",
    paddingRight: 42,
    ...style,
  };

  const defaultBtn = {
    position: "absolute",
    right: 4,
    top: "50%",
    transform: "translateY(-50%)",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.35)",
    borderRadius: 6,
    cursor: disabled ? "default" : "pointer",
    padding: "3px 7px",
    fontSize: 15,
    lineHeight: 1,
    opacity: disabled ? 0.45 : 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 32,
    minHeight: 28,
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        ref={inputRef}
        type="date"
        className={className}
        value={safe}
        min={min}
        max={max}
        disabled={disabled}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        style={mergedInputStyle}
        aria-label={ariaLabel}
      />
      <button
        type="button"
        aria-label={ariaLabel ? `${ariaLabel} - open calendar` : "Open calendar"}
        disabled={disabled}
        onClick={openPicker}
        style={{ ...defaultBtn, ...buttonStyle }}
      >
        {icon}
      </button>
    </div>
  );
}

export default DatePickerInput;
