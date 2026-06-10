// Per-agent circuit breaker (docs/multi_agent_orchestration_design.md).
// After `threshold` consecutive failures the circuit opens and calls fail fast
// for `cooldownMs`. The first call after the cooldown is the half-open probe —
// success closes the circuit, failure re-opens it.
//
// State is per server process, which is the right scope here: the failures
// being isolated (Groq outages, rate limits) are seen process-wide.
export class CircuitBreaker {
  private failures = 0
  private openedAt = 0

  constructor(
    readonly name: string,
    private readonly threshold = 3,
    private readonly cooldownMs = 30_000
  ) {}

  get state(): 'closed' | 'open' | 'half-open' {
    if (this.failures < this.threshold) return 'closed'
    return Date.now() - this.openedAt < this.cooldownMs ? 'open' : 'half-open'
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.failures >= this.threshold) {
      const elapsed = Date.now() - this.openedAt
      if (elapsed < this.cooldownMs) {
        throw new Error(
          `[circuit:${this.name}] open — failing fast, half-open in ${Math.ceil((this.cooldownMs - elapsed) / 1000)}s`
        )
      }
      // Cooldown elapsed — let this call through as the half-open probe
    }

    try {
      const result = await fn()
      this.failures = 0
      return result
    } catch (error) {
      this.failures++
      if (this.failures >= this.threshold) {
        this.openedAt = Date.now()
        console.warn(`[circuit:${this.name}] opened after ${this.failures} consecutive failures`)
      }
      throw error
    }
  }
}
