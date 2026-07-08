import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { MoviesController } from "../movies.controller.js";
import type { MoviesService } from "../movies.service.js";

describe("MoviesController", () => {
  it("rejects a query missing the required `q` param", async () => {
    const fakeService = { search: vi.fn() } as unknown as MoviesService;
    const controller = new MoviesController(fakeService);

    await expect(controller.search({})).rejects.toBeInstanceOf(BadRequestException);
    expect(fakeService.search).not.toHaveBeenCalled();
  });

  it("passes a valid query through to the service", async () => {
    const fakeService = { search: vi.fn().mockResolvedValue([]) } as unknown as MoviesService;
    const controller = new MoviesController(fakeService);

    await controller.search({ q: "matrix" });

    expect(fakeService.search).toHaveBeenCalledWith("matrix");
  });
});
