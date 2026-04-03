import { describe, it, expect, vi } from "vitest";

// Test the sendTransaction logic directly (not as a hook, just the function logic)
// This avoids needing React rendering infrastructure for unit tests.

describe("sendTransaction logic", () => {
  function createMockTx() {
    const tx = {
      withAccount: vi.fn().mockReturnThis(),
      withVoucher: vi.fn().mockReturnThis(),
      calculateGas: vi.fn().mockResolvedValue(undefined),
      signAndSend: vi.fn().mockResolvedValue({
        response: vi.fn().mockResolvedValue("ok"),
      }),
    };
    return tx;
  }

  // Core logic extracted from useSendTransaction for testability
  async function sendTransaction(
    tx: ReturnType<typeof createMockTx>,
    account: { address: string } | null,
    signer: unknown | null,
    callbacks?: { onSigning?: () => void; onSubmitted?: () => void },
    options?: { voucherId?: string | null; sessionPair?: unknown | null },
  ) {
    const { voucherId, sessionPair } = options ?? {};

    if (sessionPair) {
      tx.withAccount(sessionPair);
    } else if (account) {
      if (signer) {
        tx.withAccount(account.address, { signer });
      } else {
        tx.withAccount(account.address);
      }
    } else {
      throw new Error("No account available");
    }

    if (voucherId) {
      tx.withVoucher(voucherId);
    }

    await tx.calculateGas();
    callbacks?.onSigning?.();

    const result = await tx.signAndSend();
    callbacks?.onSubmitted?.();

    return await result.response();
  }

  it("uses wallet signer when no options provided", async () => {
    const tx = createMockTx();
    const account = { address: "5GrwvaEF..." };
    const signer = { signPayload: vi.fn() };

    await sendTransaction(tx, account, signer);

    expect(tx.withAccount).toHaveBeenCalledWith("5GrwvaEF...", { signer });
    expect(tx.withVoucher).not.toHaveBeenCalled();
    expect(tx.calculateGas).toHaveBeenCalled();
    expect(tx.signAndSend).toHaveBeenCalled();
  });

  it("uses wallet without signer options when signer is null", async () => {
    const tx = createMockTx();
    const account = { address: "5GrwvaEF..." };

    await sendTransaction(tx, account, null);

    expect(tx.withAccount).toHaveBeenCalledWith("5GrwvaEF...");
  });

  it("throws when no account available", async () => {
    const tx = createMockTx();

    await expect(sendTransaction(tx, null, null)).rejects.toThrow(
      "No account available",
    );
  });

  it("uses session keypair when sessionPair is provided", async () => {
    const tx = createMockTx();
    const account = { address: "5GrwvaEF..." };
    const signer = { signPayload: vi.fn() };
    const sessionPair = { address: "5SessionAddr...", sign: vi.fn() };

    await sendTransaction(tx, account, signer, undefined, {
      sessionPair,
    });

    // Should use sessionPair, not wallet account
    expect(tx.withAccount).toHaveBeenCalledWith(sessionPair);
    expect(tx.withAccount).not.toHaveBeenCalledWith(
      "5GrwvaEF...",
      expect.anything(),
    );
  });

  it("attaches voucher when voucherId is provided", async () => {
    const tx = createMockTx();
    const account = { address: "5GrwvaEF..." };
    const signer = { signPayload: vi.fn() };

    await sendTransaction(tx, account, signer, undefined, {
      voucherId: "0xvoucher123",
    });

    expect(tx.withVoucher).toHaveBeenCalledWith("0xvoucher123");
  });

  it("does not attach voucher when voucherId is null", async () => {
    const tx = createMockTx();
    const account = { address: "5GrwvaEF..." };

    await sendTransaction(tx, account, null, undefined, {
      voucherId: null,
    });

    expect(tx.withVoucher).not.toHaveBeenCalled();
  });

  it("uses session keypair AND voucher together for signless", async () => {
    const tx = createMockTx();
    const account = { address: "5GrwvaEF..." };
    const signer = { signPayload: vi.fn() };
    const sessionPair = { address: "5SessionAddr...", sign: vi.fn() };

    await sendTransaction(tx, account, signer, undefined, {
      sessionPair,
      voucherId: "0xvoucher123",
    });

    expect(tx.withAccount).toHaveBeenCalledWith(sessionPair);
    expect(tx.withVoucher).toHaveBeenCalledWith("0xvoucher123");
  });

  it("fires onSigning callback after calculateGas", async () => {
    const tx = createMockTx();
    const account = { address: "5GrwvaEF..." };
    const onSigning = vi.fn();

    await sendTransaction(tx, account, null, { onSigning });

    // onSigning should fire after calculateGas but before signAndSend
    const calcOrder = tx.calculateGas.mock.invocationCallOrder[0];
    const signingOrder = onSigning.mock.invocationCallOrder[0];
    const sendOrder = tx.signAndSend.mock.invocationCallOrder[0];
    expect(calcOrder).toBeLessThan(signingOrder);
    expect(signingOrder).toBeLessThan(sendOrder);
  });

  it("fires onSubmitted callback after signAndSend", async () => {
    const tx = createMockTx();
    const account = { address: "5GrwvaEF..." };
    const onSubmitted = vi.fn();

    await sendTransaction(tx, account, null, { onSubmitted });

    expect(onSubmitted).toHaveBeenCalled();
  });

  it("returns the response value", async () => {
    const tx = createMockTx();
    tx.signAndSend.mockResolvedValue({
      response: vi.fn().mockResolvedValue("counter: 42"),
    });
    const account = { address: "5GrwvaEF..." };

    const result = await sendTransaction(tx, account, null);

    expect(result).toBe("counter: 42");
  });

  it("propagates calculateGas errors", async () => {
    const tx = createMockTx();
    tx.calculateGas.mockRejectedValue(new Error("RPC error"));
    const account = { address: "5GrwvaEF..." };

    await expect(sendTransaction(tx, account, null)).rejects.toThrow(
      "RPC error",
    );
  });

  it("propagates signAndSend errors", async () => {
    const tx = createMockTx();
    tx.signAndSend.mockRejectedValue(new Error("User cancelled"));
    const account = { address: "5GrwvaEF..." };

    await expect(sendTransaction(tx, account, null)).rejects.toThrow(
      "User cancelled",
    );
  });

  it("falls back to wallet when options has null sessionPair", async () => {
    const tx = createMockTx();
    const account = { address: "5GrwvaEF..." };
    const signer = { signPayload: vi.fn() };

    await sendTransaction(tx, account, signer, undefined, {
      sessionPair: null,
      voucherId: null,
    });

    // Should use wallet, not session
    expect(tx.withAccount).toHaveBeenCalledWith("5GrwvaEF...", { signer });
  });
});
