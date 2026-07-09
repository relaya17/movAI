import { ArchivePlayerWithSubtitles } from "@/components/movie/ArchivePlayerWithSubtitles";
import { getArchivePlayback } from "@/lib/movie-playback";

interface ArchiveMoviePlayerProps {
  movieId: string;
  identifier: string;
  title: string;
  preferredLanguage?: string;
}

/** Server wrapper — uses direct MP4 + VTT overlay when subtitles are ready. */
export async function ArchiveMoviePlayer({
  movieId,
  identifier,
  title,
  preferredLanguage = "he"
}: ArchiveMoviePlayerProps): Promise<React.ReactElement> {
  const playback = await getArchivePlayback(movieId, identifier, preferredLanguage);

  if (playback) {
    return (
      <ArchivePlayerWithSubtitles
        videoUrl={playback.videoUrl}
        title={title}
        vttContent={playback.vttContent}
      />
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg">
      <iframe
        src={`https://archive.org/embed/${identifier}`}
        title={`נגן Internet Archive — ${title}`}
        className="h-full w-full"
        allowFullScreen
      />
    </div>
  );
}
