'use client';

import { AI } from "remotestorage-module-ai-wallet";
import { useEffect, useRef, useState } from "react";
import { useRemoteStorage } from "@/hooks/use-remote-storage";

export default function AIConfig() {
  const wallet = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  const remoteStorage = useRemoteStorage({
    modules: [AI],
    accessClaims: { "ai-wallet": "rw" },
    apiKeys: { googledrive: "" }
  });

  useEffect(() => {
    Promise.all([import("m5x5-remotestorage-widget"), import("ai-wallet")]).then(() => {
      setMounted(true);
    })
  }, []);

  useEffect(() => {
    if (wallet.current && remoteStorage && mounted) {
      console.log(wallet.current);

      (remoteStorage as any).aiWallet?.getConfig().then((config: any) => {
        console.log(config);
      }).catch((err: any) => console.error(err));

      console.log(wallet.current);
      wallet.current.setRemoteStorage(remoteStorage);
    }
  }, [wallet.current, remoteStorage, mounted]);

  if (!mounted) return null;

  return (
    <div id="test">
      {/* @ts-ignore - Custom web component */}
      <remotestorage-widget ref={wallet} leaveOpen></remotestorage-widget>
    </div>
  );
}
