export interface HealthRecord {
  backendId: string;
  provider: string;
  available: boolean;
  latencyMs: number;
  successCount: number;
  failureCount: number;
  lastCheckedAt: number;
  cooldownUntil: number;
  lastError: string | null;
}

/**
 * Provider Health Monitor (§9, §10).
 * Tracks endpoint reachability, failure history, and temporary cooldowns.
 */
export class ProviderHealthMonitor {
  private static healthMap = new Map<string, HealthRecord>();

  private static getOrCreate(backendId: string, provider: string): HealthRecord {
    const key = backendId;
    let record = this.healthMap.get(key);
    if (!record) {
      record = {
        backendId,
        provider,
        available: true,
        latencyMs: 300,
        successCount: 1,
        failureCount: 0,
        lastCheckedAt: Date.now(),
        cooldownUntil: 0,
        lastError: null,
      };
      this.healthMap.set(key, record);
    }
    return record;
  }

  public static isAvailable(backendIdOrProvider: string, maybeProvider?: string): boolean {
    const key = backendIdOrProvider;
    const record = this.healthMap.get(key);
    if (!record) return true;
    if (record.cooldownUntil > Date.now()) {
      return false;
    }
    return record.available;
  }

  public static recordSuccess(backendIdOrProvider: string, providerOrLatency: string | number, maybeLatency?: number) {
    let backendId = backendIdOrProvider;
    let provider = typeof providerOrLatency === "string" ? providerOrLatency : backendIdOrProvider;
    let latencyMs = typeof providerOrLatency === "number" ? providerOrLatency : (maybeLatency ?? 250);

    const record = this.getOrCreate(backendId, provider);
    record.available = true;
    record.successCount++;
    record.latencyMs = Math.round((record.latencyMs * 4 + latencyMs) / 5);
    record.lastCheckedAt = Date.now();
    record.cooldownUntil = 0;
    record.lastError = null;
  }

  public static recordFailure(
    backendIdOrProvider: string,
    providerOrError: string,
    errorOrLatency?: string | number,
    status: number | string = 500,
    cooldownMs = 30000
  ) {
    let backendId = backendIdOrProvider;
    let provider = typeof errorOrLatency === "string" ? providerOrError : backendIdOrProvider;
    let error = typeof errorOrLatency === "string" ? errorOrLatency : (providerOrError || "Unknown error");

    const record = this.getOrCreate(backendId, provider);
    record.failureCount++;
    record.lastCheckedAt = Date.now();
    record.lastError = String(error);

    record.cooldownUntil = Date.now() + cooldownMs;
    if (record.failureCount >= 3) {
      record.available = false;
    }
  }

  public static getReport(): Record<string, HealthRecord> {
    const obj: Record<string, HealthRecord> = {};
    for (const [k, v] of this.healthMap.entries()) {
      obj[k] = { ...v };
    }
    return obj;
  }
}
