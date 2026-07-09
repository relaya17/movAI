import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { AdminController } from "../admin.controller.js";

describe("AdminController", () => {
  it("rejects an invalid ingestion payload", async () => {
    const add = vi.fn();
    const controller = new AdminController({ add });

    await expect(controller.ingest({ source: "not-a-real-source" })).rejects.toBeInstanceOf(BadRequestException);
    expect(add).not.toHaveBeenCalled();
  });

  it("enqueues a valid ingestion job", async () => {
    const add = vi.fn().mockResolvedValue({ id: "job-123" });
    const controller = new AdminController({ add });

    const result = await controller.ingest({ source: "archive", query: "public domain classics" });

    expect(add).toHaveBeenCalledWith("manual-ingest", { source: "archive", query: "public domain classics" });
    expect(result).toEqual({ jobId: "job-123" });
  });
});
