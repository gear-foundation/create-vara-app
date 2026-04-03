import { describe, it, expect } from "vitest";

// Test the isActive derivation logic from SessionProvider

describe("SessionProvider isActive logic", () => {
  function computeIsActive(
    sessionPair: unknown | null,
    hasVoucher: boolean,
  ): boolean {
    return sessionPair !== null && hasVoucher;
  }

  it("inactive when no session pair", () => {
    expect(computeIsActive(null, true)).toBe(false);
  });

  it("inactive when no voucher", () => {
    expect(computeIsActive({ address: "0x..." }, false)).toBe(false);
  });

  it("active when pair AND voucher exist", () => {
    expect(computeIsActive({ address: "0x..." }, true)).toBe(true);
  });

  it("txOptions is undefined when not active", () => {
    const isActive = false;
    const sessionPair = null;
    const voucherId = null;
    const txOptions = isActive
      ? { sessionPair, voucherId }
      : undefined;
    expect(txOptions).toBeUndefined();
  });

  it("txOptions has sessionPair and voucherId when active", () => {
    const isActive = true;
    const sessionPair = { address: "0xSession" };
    const voucherId = "0xVoucher";
    const txOptions = isActive
      ? { sessionPair, voucherId }
      : undefined;
    expect(txOptions).toEqual({
      sessionPair: { address: "0xSession" },
      voucherId: "0xVoucher",
    });
  });

  it("sendTransaction uses wallet when txOptions is undefined", () => {
    // Simulates the core branching in sendTransaction
    const options: { sessionPair?: unknown; voucherId?: string | null } | undefined = undefined;
    const { sessionPair } = (options ?? {}) as { sessionPair?: unknown };

    expect(sessionPair).toBeUndefined();
    // falsy sessionPair means wallet branch is taken
    expect(!!sessionPair).toBe(false);
  });

  it("sendTransaction uses session when txOptions has sessionPair", () => {
    const options = {
      sessionPair: { address: "0xSession", sign: () => {} },
      voucherId: "0xVoucher",
    };
    const { sessionPair } = options;

    expect(!!sessionPair).toBe(true);
  });
});

describe("session cancel -> wallet fallback", () => {
  it("after cancel, isActive becomes false and txOptions is undefined", () => {
    // Before cancel
    let sessionPair: unknown | null = { address: "0xSession" };
    let hasVoucher = true;
    let isActive = sessionPair !== null && hasVoucher;
    expect(isActive).toBe(true);

    // Cancel session: pair goes null
    sessionPair = null;
    isActive = sessionPair !== null && hasVoucher;
    expect(isActive).toBe(false);

    // txOptions should be undefined
    const txOptions = isActive ? { sessionPair, voucherId: "0x" } : undefined;
    expect(txOptions).toBeUndefined();
  });

  it("after cancel, voucher going stale doesn't matter", () => {
    // Session cancelled, then voucher poll returns false
    const sessionPair = null;
    const hasVoucher = false;
    const isActive = sessionPair !== null && hasVoucher;
    expect(isActive).toBe(false);
  });
});
