import { useState, useEffect } from "react";

/**
 * Hook to detect if the app is running in standalone PWA mode
 * Checks display-mode media query and navigator.standalone
 */
export function useStandaloneDetection() {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check if the app is running in standalone mode (PWA)
      const isInStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes("android-app://");

      setIsStandalone(isInStandaloneMode);

      // Listen for changes in display mode
      const mediaQueryList = window.matchMedia("(display-mode: standalone)");
      const handleChange = (e: MediaQueryListEvent) => {
        setIsStandalone(
          e.matches || (window.navigator as any).standalone || false
        );
      };

      // Modern browsers use addEventListener, older ones use addListener
      if (mediaQueryList.addEventListener) {
        mediaQueryList.addEventListener("change", handleChange);
      } else if (mediaQueryList.addListener) {
        // For Safari < 14
        mediaQueryList.addListener(handleChange);
      }

      return () => {
        if (mediaQueryList.removeEventListener) {
          mediaQueryList.removeEventListener("change", handleChange);
        } else if (mediaQueryList.removeListener) {
          mediaQueryList.removeListener(handleChange);
        }
      };
    }
  }, []);

  return isStandalone;
}
