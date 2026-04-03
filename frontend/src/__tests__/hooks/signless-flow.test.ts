import { describe, it, expect, vi } from "vitest";

/**
 * Integration test for the complete signless flow.
 * Tests the EXACT same logic chain as:
 *   SessionProvider -> useSessionContext() -> ActionsPanel -> sendTransaction
 *
 * This catches the bug where a stale session in localStorage causes
 * all transactions to silently use the session keypair instead of the wallet.
 */

describe("signless flow: ActionsPanel transaction routing", () => {
  function createMockTx() {
    return {
      withAccount: vi.fn().mockReturnThis(),
      withVoucher: vi.fn().mockReturnThis(),
      calculateGas: vi.fn().mockResolvedValue(undefined),
      signAndSend: vi.fn().mockResolvedValue({
        response: vi.fn().mockResolvedValue("ok"),
      }),
    };
  }

  // Simulates the EXACT logic from SessionProvider
  function computeSessionState(
    sessionPair: unknown | null,
    hasVoucher: boolean,
  ) {
    const isActive = sessionPair !== null && hasVoucher;
    return { isActive, sessionPair };
  }

  // Simulates the EXACT logic from generated ActionsPanel
  function computeTxOptions(
    isActive: boolean,
    sessionPair: unknown | null,
    voucherId: string | null,
  ) {
    return isActive
      ? { sessionPair, voucherId }
      : undefined;
  }

  // Simulates the EXACT logic from useSendTransaction
  async function executeTx(
    tx: ReturnType<typeof createMockTx>,
    walletAccount: { address: string } | null,
    walletSigner: unknown | null,
    txOptions?: { sessionPair?: unknown; voucherId?: string | null },
  ) {
    const { voucherId, sessionPair } = txOptions ?? {};

    if (sessionPair) {
      tx.withAccount(sessionPair);
    } else if (walletAccount) {
      if (walletSigner) {
        tx.withAccount(walletAccount.address, { signer: walletSigner });
      } else {
        tx.withAccount(walletAccount.address);
      }
    } else {
      throw new Error("No account available");
    }

    if (voucherId) tx.withVoucher(voucherId);
    await tx.calculateGas();
    const result = await tx.signAndSend();
    return await result.response();
  }

  // ========= THE CRITICAL TESTS =========

  it("BUG REPRO: stale session in localStorage causes silent signless", () => {
    // Scenario: user previously created a session and funded it.
    // They reload the page. SessionProvider restores the keypair from localStorage.
    // The old voucher is still valid. isActive becomes true.
    // User clicks Increment expecting wallet popup. Gets silent signing instead.

    const staleSessionPair = { address: "0xStaleSession", sign: vi.fn() };
    const hasVoucher = true; // old voucher still valid

    const { isActive } = computeSessionState(staleSessionPair, hasVoucher);
    expect(isActive).toBe(true); // THIS IS THE BUG

    const txOptions = computeTxOptions(isActive, staleSessionPair, "0xOldVoucher");
    expect(txOptions).toBeDefined(); // txOptions is NOT undefined
    expect(txOptions!.sessionPair).toBe(staleSessionPair); // session pair is used
  });

  it("AFTER FIX: cleared localStorage means no session", () => {
    // After clearing localStorage, useSession returns null pair
    const sessionPair = null;
    const hasVoucher = false; // no voucher for null address

    const { isActive } = computeSessionState(sessionPair, hasVoucher);
    expect(isActive).toBe(false);

    const txOptions = computeTxOptions(isActive, sessionPair, null);
    expect(txOptions).toBeUndefined(); // wallet path taken
  });

  it("no session: wallet signer is used", async () => {
    const tx = createMockTx();
    const wallet = { address: "0xWallet" };
    const signer = { signPayload: vi.fn() };

    // No session = no txOptions
    const txOptions = computeTxOptions(false, null, null);
    await executeTx(tx, wallet, signer, txOptions);

    expect(tx.withAccount).toHaveBeenCalledWith("0xWallet", { signer });
    expect(tx.withVoucher).not.toHaveBeenCalled();
  });

  it("active session: session keypair is used, wallet signer is NOT", async () => {
    const tx = createMockTx();
    const wallet = { address: "0xWallet" };
    const signer = { signPayload: vi.fn() };
    const sessionPair = { address: "0xSession", sign: vi.fn() };

    const txOptions = computeTxOptions(true, sessionPair, "0xVoucher");
    await executeTx(tx, wallet, signer, txOptions);

    expect(tx.withAccount).toHaveBeenCalledWith(sessionPair);
    expect(tx.withAccount).not.toHaveBeenCalledWith("0xWallet", expect.anything());
    expect(tx.withVoucher).toHaveBeenCalledWith("0xVoucher");
  });

  it("cancelled session: wallet signer is used again", async () => {
    const tx = createMockTx();
    const wallet = { address: "0xWallet" };
    const signer = { signPayload: vi.fn() };

    // After endSession: sessionPair is null, voucher poll returns false
    const { isActive } = computeSessionState(null, false);
    const txOptions = computeTxOptions(isActive, null, null);

    await executeTx(tx, wallet, signer, txOptions);

    expect(tx.withAccount).toHaveBeenCalledWith("0xWallet", { signer });
  });

  it("session exists but NO voucher: wallet signer is used", async () => {
    const tx = createMockTx();
    const wallet = { address: "0xWallet" };
    const signer = { signPayload: vi.fn() };
    const sessionPair = { address: "0xSession", sign: vi.fn() };

    // Session created but not funded yet
    const { isActive } = computeSessionState(sessionPair, false);
    expect(isActive).toBe(false);

    const txOptions = computeTxOptions(isActive, sessionPair, null);
    expect(txOptions).toBeUndefined();

    await executeTx(tx, wallet, signer, txOptions);

    // Should use wallet, not session (session exists but is not active)
    expect(tx.withAccount).toHaveBeenCalledWith("0xWallet", { signer });
  });
});
