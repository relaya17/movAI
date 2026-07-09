import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { PublicMovie } from "@movai/types";
import type { ContentAdapter } from "./adapter";
import { CircuitBreaker } from "./resilience";

/**
 * Internet Archive (archive.org) adapter - the cleanest source legally
 * (architecture plan §1.1): open API, content is mostly public-domain or
 * openly licensed. We still record a per-item license so the UI/legal
 * disclaimer can be accurate rather than assuming everything is PD.
 */

const ARCHIVE_SEARCH_RESPONSE_SCHEMA = z.object({
  response: z.object({
    docs: z.array(
      z.object({
        identifier: z.string(),
        title: z.string(),
        description: z.union([z.string(), z.array(z.string())]).optional(),
        year: z.union([z.string(), z.number()]).optional(),
        licenseurl: z.string().optional()
      })
    )
  })
});

export interface ArchiveOrgAdapterOptions {
  fetchImpl?: typeof fetch;
}

export function createArchiveOrgAdapter(options: ArchiveOrgAdapterOptions = {}): ContentAdapter {
  const fetchImpl = options.fetchImpl ?? fetch;
  const breaker = new CircuitBreaker("archive-org");

  return {
    name: "archive",

    async search(query: string): Promise<PublicMovie[]> {
      return breaker.execute(
        async () => {
          const url = new URL("https://archive.org/advancedsearch.php");
          url.searchParams.set("q", `${query} AND mediatype:(movies)`);
          url.searchParams.set("fl[]", "identifier,title,description,year,licenseurl");
          url.searchParams.set("rows", "20");
          url.searchParams.set("output", "json");

          const response = await fetchImpl(url.toString());
          if (!response.ok) {
            throw new Error(`archive.org API responded with ${response.status}`);
          }

          const raw: unknown = await response.json();
          const parsed = ARCHIVE_SEARCH_RESPONSE_SCHEMA.parse(raw);

          return parsed.response.docs.map(mapToPublicMovie);
        },
        () => []
      );
    },

    async checkLinkAlive(movie: PublicMovie): Promise<boolean> {
      if (movie.watchSource.kind !== "archive") return true;
      return breaker.execute(
        async () => {
          const identifier = movie.watchSource.kind === "archive" ? movie.watchSource.identifier : "";
          const response = await fetchImpl(`https://archive.org/metadata/${identifier}`, { method: "HEAD" });
          return response.ok;
        },
        () => true
      );
    }
  };
}

function mapToPublicMovie(
  doc: z.infer<typeof ARCHIVE_SEARCH_RESPONSE_SCHEMA>["response"]["docs"][number]
): PublicMovie {
  const description = Array.isArray(doc.description) ? doc.description.join(" ") : (doc.description ?? "");
  const year = typeof doc.year === "string" ? Number.parseInt(doc.year, 10) : (doc.year ?? new Date().getFullYear());
  const license = classifyLicense(doc.licenseurl);

  return {
    id: randomUUID(),
    slug: doc.identifier,
    title: doc.title,
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
    genres: [],
    synopsis: description || doc.title,
    // Archive.org's `mediatype:(movies)` filter in the search query above
    // means everything this adapter ever returns is a film - contentType is
    // always "movie" here regardless of what the caller passed in, unlike
    // youtube.ts which actually varies its results by contentType.
    contentType: "movie",
    watchSource: { kind: "archive", identifier: doc.identifier, license },
    linkStatus: "unchecked"
  };
}

function classifyLicense(licenseUrl: string | undefined): "public-domain" | "cc-by" | "cc-by-sa" | "cc0" | "unknown" {
  if (!licenseUrl) return "unknown";
  if (licenseUrl.includes("publicdomain")) return "public-domain";
  if (licenseUrl.includes("by-sa")) return "cc-by-sa";
  if (licenseUrl.includes("zero")) return "cc0";
  if (licenseUrl.includes("by")) return "cc-by";
  return "unknown";
}
