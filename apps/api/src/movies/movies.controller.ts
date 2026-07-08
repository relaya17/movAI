import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { z } from "zod";
import type { PublicMovie } from "@movai/types";
import { MoviesService } from "./movies.service";

// Every request boundary is validated with zod - `unknown` in, typed data
// out, never `any` (architecture plan §4.3).
const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200)
});

@Controller("movies")
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  async search(@Query() rawQuery: unknown): Promise<PublicMovie[]> {
    const parsed = SearchQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.moviesService.search(parsed.data.q);
  }
}
