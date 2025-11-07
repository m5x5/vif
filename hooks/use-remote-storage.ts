import { useEffect, useRef, useState } from "react";
import RemoteStorage from "remotestoragejs";
import type { RSModule } from "remotestoragejs";
import { Todonna } from "@/lib/remotestorage-todonna";

// Singleton instance
let remoteStorageInstance: RemoteStorage | null = null;
let isInitialized = false;

interface UseRemoteStorageOptions {
  modules?: RSModule[];
  accessClaims?: Record<string, 'r' | 'rw'>;
  apiKeys?: {
    googledrive?: string;
    dropbox?: string;
  };
}

/**
 * Hook to access the singleton RemoteStorage instance.
 * Ensures only one instance is created and access claims are done immediately after creation.
 *
 * @param options - Configuration options
 * @param options.modules - Array of RemoteStorage modules to load
 * @param options.accessClaims - Object defining access scopes (e.g., { 'ai-wallet': 'rw' })
 * @param options.apiKeys - API keys for storage providers
 * @returns The RemoteStorage instance
 *
 * @example
 * import { AI } from "remotestorage-module-ai-wallet";
 * const remoteStorage = useRemoteStorage({
 *   modules: [AI],
 *   accessClaims: { 'ai-wallet': 'rw', 'todonna': 'rw' }
 * });
 */
export function useRemoteStorage(options?: UseRemoteStorageOptions): RemoteStorage | null {
  const hasClaimedAccess = useRef(false);
  const [instance, setInstance] = useState<RemoteStorage | null>(remoteStorageInstance);

  useEffect(() => {
    // Create singleton instance if it doesn't exist
    if (!remoteStorageInstance) {
      // Always include Todonna module by default
      const modules = [Todonna, ...(options?.modules || [])];
      remoteStorageInstance = new RemoteStorage({
        modules
      });
      isInitialized = false;
      setInstance(remoteStorageInstance);
    }

    // Configure API keys if provided
    if (options?.apiKeys && remoteStorageInstance && !isInitialized) {
      remoteStorageInstance.setApiKeys(options.apiKeys);
    }

    // Default access claims - always claim todonna and ai-wallet
    const defaultClaims = {
      'todonna': 'rw' as const,
      'ai-wallet': 'rw' as const,
      ...(options?.accessClaims || {})
    };

    // Claim access immediately after instance creation (only once)
    if (!hasClaimedAccess.current && !isInitialized && remoteStorageInstance) {
      Object.entries(defaultClaims).forEach(([module, mode]) => {
        remoteStorageInstance!.access.claim(module, mode);
      });

      // Enable caching for todonna
      remoteStorageInstance.caching.enable("/todonna/");
      remoteStorageInstance.caching.enable("/ai-wallet/");

      hasClaimedAccess.current = true;
      isInitialized = true;
    }
  }, [options?.accessClaims, options?.modules, options?.apiKeys]);

  return instance;
}