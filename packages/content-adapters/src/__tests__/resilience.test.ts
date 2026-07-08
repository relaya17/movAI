import { describe, expect, it, vi } from "vitest";
import { CircuitBreaker, CircuitOpenError } from "../resilience";

describe("CircuitBreaker", () => {
  it("returns the successful result on the first try", async () => {
    const breaker = new CircuitBreaker("test", {
      retries: 3,
      backoffMs: 1,
      circuitBreakerThreshold: 5,
      circuitBreakerCooldownMs: 1000
    });

    const result = await breaker.execute(
      async () => "ok",
      () => "fallback"
    );

    expect(result).toBe("ok");
  });

  it("retries on failure then falls back instead of throwing", async () => {
    const breaker = new CircuitBreaker("test", {
      retries: 2,
      backoffMs: 1,
      circuitBreakerThreshold: 5,
      circuitBreakerCooldownMs: 1000
    });

    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const result = await breaker.execute(fn, () => "fallback");

    expect(result).toBe("fallback");
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it("opens the circuit after the failure threshold and rejects new calls", async () => {
    const breaker = new CircuitBreaker("test", {
      retries: 0,
      backoffMs: 1,
      circuitBreakerThreshold: 2,
      circuitBreakerCooldownMs: 10_000
    });

    const failing = async () => {
      throw new Error("boom");
    };

    await breaker.execute(failing, () => "fallback");
    await breaker.execute(failing, () => "fallback");

    expect(breaker.getState()).toBe("open");
    await expect(breaker.execute(failing, () => "fallback")).rejects.toBeInstanceOf(CircuitOpenError);
  });
});
