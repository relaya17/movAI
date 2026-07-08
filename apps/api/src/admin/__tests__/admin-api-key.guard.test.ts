import "reflect-metadata";
import { describe, expect, it, afterEach } from "vitest";
import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { AdminApiKeyGuard } from "../admin-api-key.guard.js";

function createContext(headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers })
    })
  } as unknown as ExecutionContext;
}

describe("AdminApiKeyGuard", () => {
  const originalKey = process.env.ADMIN_API_KEY;
  afterEach(() => {
    process.env.ADMIN_API_KEY = originalKey;
  });

  it("rejects when ADMIN_API_KEY is not configured", () => {
    delete process.env.ADMIN_API_KEY;
    const guard = new AdminApiKeyGuard();

    expect(() => guard.canActivate(createContext({ "x-admin-key": "anything" }))).toThrow(UnauthorizedException);
  });

  it("rejects a missing or wrong key", () => {
    process.env.ADMIN_API_KEY = "correct-key";
    const guard = new AdminApiKeyGuard();

    expect(() => guard.canActivate(createContext({ "x-admin-key": "wrong-key" }))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(createContext({}))).toThrow(UnauthorizedException);
  });

  it("allows the correct key", () => {
    process.env.ADMIN_API_KEY = "correct-key";
    const guard = new AdminApiKeyGuard();

    expect(guard.canActivate(createContext({ "x-admin-key": "correct-key" }))).toBe(true);
  });
});
