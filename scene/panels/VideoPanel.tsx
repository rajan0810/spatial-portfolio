"use client";

import { useVideoTexture } from "@react-three/drei";
import { Suspense } from "react";

import { Panel, type PanelProps } from "./Panel";

type VideoPanelProps = Omit<PanelProps, "map"> & {
  url: string | null | undefined;
};

function VideoPanelInner({ url, ...panelProps }: VideoPanelProps & { url: string }) {
  const texture = useVideoTexture(url, {
    muted: true,
    loop: true,
    start: true,
    playsInline: true,
    // Required for a cross-origin file (Supabase Storage) to be readable as a
    // texture. Without it WebGL refuses the upload and the panel stays black.
    crossOrigin: "anonymous",
  });

  return <Panel {...panelProps} map={texture} />;
}

/**
 * A panel filled with looping video, falling back to empty glass.
 *
 * The fallback is not just for loading: until a compressed loop exists for a
 * project, `url` is null and the panel simply reads as an unlit screen. That
 * keeps the scene honest rather than showing a broken video element.
 */
export function VideoPanel({ url, ...panelProps }: VideoPanelProps) {
  if (!url) return <Panel {...panelProps} />;

  return (
    <Suspense fallback={<Panel {...panelProps} />}>
      <VideoPanelInner url={url} {...panelProps} />
    </Suspense>
  );
}
