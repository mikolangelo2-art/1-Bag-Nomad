import {
  createContext,
  useContext,
  useRef,
  useCallback,
  useMemo,
  useState,
  useEffect,
} from "react";

const Ctx = createContext(null);

export function SuggestionPhotoDedupProvider({ children }) {
  const urlToOwnerRef = useRef(new Map());

  const register = useCallback((url, instanceId) => {
    if (!url || instanceId == null) return { isDuplicate: false };
    const id = String(instanceId);
    const owner = urlToOwnerRef.current.get(url);
    if (owner && owner !== id) return { isDuplicate: true };
    if (!owner) urlToOwnerRef.current.set(url, id);
    return { isDuplicate: false };
  }, []);

  const unregister = useCallback((url, instanceId) => {
    if (!url || instanceId == null) return;
    const id = String(instanceId);
    if (urlToOwnerRef.current.get(url) === id) urlToOwnerRef.current.delete(url);
  }, []);

  const value = useMemo(() => ({ register, unregister }), [register, unregister]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Marks duplicate when another card in the same provider already claimed this image URL. */
export function useSuggestionPhotoDuplicate(url, instanceId) {
  const ctx = useContext(Ctx);
  const [isDuplicate, setIsDuplicate] = useState(false);

  useEffect(() => {
    if (!ctx || !url) {
      setIsDuplicate(false);
      return undefined;
    }
    const { isDuplicate: d } = ctx.register(url, instanceId);
    setIsDuplicate(d);
    return () => ctx.unregister(url, instanceId);
  }, [url, instanceId, ctx]);

  return isDuplicate;
}
