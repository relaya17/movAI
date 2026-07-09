"use client";

import { useRef, useState } from "react";
import { SubtitleOverlay } from "./SubtitleOverlay";

interface ArchivePlayerWithSubtitlesProps {
  videoUrl: string;
  title: string;
  vttContent: string;
}

/** Direct MP4 playback so WebVTT overlays can sync (iframes cannot). */
export function ArchivePlayerWithSubtitles({
  videoUrl,
  title,
  vttContent
}: ArchivePlayerWithSubtitlesProps): React.ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
      <video
        ref={videoRef}
        src={videoUrl}
        title={title}
        controls
        className="h-full w-full"
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
      />
      <SubtitleOverlay vttContent={vttContent} currentTime={currentTime} />
    </div>
  );
}
