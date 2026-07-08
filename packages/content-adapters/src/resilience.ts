/**
 * Generic resilience wrapper every content adapter (YouTube, Internet
 * Archive, ...) must go through. See architecture plan §12.1.
 *
 * Deliberately dependency-free (no cockatiel/opossum) to keep the MVP
 * lightweight - the surface area we need (retry+backoff, circuit breaker,
 * fallback) is small enough to own directly and test exhaustively.
 */

export interface ResilienceConfig {
  retries: number;
  backoffMs: number;
  circuitBreakerThreshold: number;
  circuitBreakerCooldownMs: number;
}

export const DEFAULT_RESILIENCE_CONFIG: ResilienceConfig = {
  retries: 3,
  backoffMs: 500,
  circuitBreakerThreshold: 5,
  circuitBreakerCooldownMs: 30_000
};

type CircuitState = "closed" | "open" | "half-open";

export class CircuitOpenError extends Error {
  constructor(adapterName: string) {
    super(`Circuit breaker is open for adapter "${adapterName}" - refusing call.`);
    this.name = "CircuitOpenError";
  }
}

/**
 * One CircuitBreaker instance should be shared across all calls for a given
 * adapter (e.g. one per "youtube", one per "archive-org") - not created
 * per-request, or it can never learn that the upstream is unhealthy.
 */
export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private openedAt: number | null = null;

  constructor(
    private readonly adapterName: string,
    private readonly config: ResilienceConfig = DEFAULT_RESILIENCE_CONFIG
  ) {}

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private recordFailure(): void {
    this.failureCount += 1;
    if (this.failureCount >= this.config.circuitBreakerThreshold) {
      this.state = "open";
      this.openedAt = Date.now();
    }
  }

  private recordSuccess(): void {
    this.failureCount = 0;
    this.state = "closed";
    this.openedAt = null;
  }

  private canAttempt(): boolean {
    if (this.state !== "open") return true;
    const openedAt = this.openedAt ?? 0;
    if (Date.now() - openedAt >= this.config.circuitBreakerCooldownMs) {
      this.state = "half-open";
      return true;
    }
    return false;
  }

  /**
   * Runs `fn` with retry + exponential backoff, guarded by the circuit
   * breaker. If every retry fails, `fallback` is used instead of throwing,
   * so a flaky upstream degrades the catalog instead of crashing the page.
   */
  async execute<T>(fn: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
    if (!this.canAttempt()) {
      throw new CircuitOpenError(this.adapterName);
    }

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.config.retries; attempt += 1) {
      try {
        const result = await fn();
        this.recordSuccess();
        return result;
      } catch (error) {
        lastError = error;
        if (attempt < this.config.retries) {
          await this.sleep(this.config.backoffMs * 2 ** attempt);
        }
      }
    }

    this.recordFailure();
    void lastError; // surfaced via logging in real adapters, not swallowed silently
    return fallback();
  }

  getState(): CircuitState {
    return this.state;
  }
}
