import { useState, useEffect } from "react";

/**
 * Hook to detect when client-side hydration is complete
 * Useful for preventing SSR/client mismatch errors
 */
export function useClientHydration() {
  const [isClientLoaded, setIsClientLoaded] = useState(false);

  useEffect(() => {
    setIsClientLoaded(true);
  }, []);

  return isClientLoaded;
}
