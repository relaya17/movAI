interface InstagramEmbedProps {
  embedUrl: string;
  title: string;
  mediaType: "reel" | "post";
  canonicalUrl: string;
}

export function InstagramEmbed({ embedUrl, title, mediaType, canonicalUrl }: InstagramEmbedProps): React.ReactElement {
  const aspectClass = mediaType === "reel" ? "aspect-[9/16] max-w-sm" : "aspect-square max-w-lg";

  return (
    <div className="space-y-3">
      <div className={`mx-auto w-full overflow-hidden rounded-lg bg-black ${aspectClass}`}>
        <iframe
          src={embedUrl}
          title={`Instagram — ${title}`}
          className="h-full w-full"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
      <p className="text-center text-xs text-neutral-500">
        מקור:{" "}
        <a href={canonicalUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
          Instagram
        </a>
        {" · "}התוכן שייך ליוצר המקורי. MoVAI מציג באמצעות הטמעה רשמית של Meta.
      </p>
    </div>
  );
}
