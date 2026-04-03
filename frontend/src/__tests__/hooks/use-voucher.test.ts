import { describe, it, expect } from "vitest";

// Test the voucher filtering/selection logic directly

interface VoucherDetails {
  owner: string;
  expiry: number;
  programs: string[] | null;
  codeUploading: boolean;
}

function filterAndSelectVoucher(
  vouchers: Record<string, VoucherDetails>,
  currentBlock: number,
): { id: string; details: VoucherDetails } | null {
  const validEntries = Object.entries(vouchers)
    .filter(([, details]) => details.expiry > currentBlock)
    .sort(([a], [b]) => a.localeCompare(b));

  if (validEntries.length > 0) {
    const [id, details] = validEntries[0];
    return { id, details };
  }
  return null;
}

describe("voucher filtering logic", () => {
  const makeVoucher = (expiry: number): VoucherDetails => ({
    owner: "0xowner",
    expiry,
    programs: null,
    codeUploading: false,
  });

  it("returns null when no vouchers exist", () => {
    expect(filterAndSelectVoucher({}, 100)).toBeNull();
  });

  it("returns null when all vouchers are expired", () => {
    const vouchers = {
      "0xaaa": makeVoucher(50),
      "0xbbb": makeVoucher(80),
    };
    expect(filterAndSelectVoucher(vouchers, 100)).toBeNull();
  });

  it("returns the only valid voucher", () => {
    const vouchers = {
      "0xaaa": makeVoucher(200),
    };
    const result = filterAndSelectVoucher(vouchers, 100);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("0xaaa");
    expect(result!.details.expiry).toBe(200);
  });

  it("filters out expired and keeps valid", () => {
    const vouchers = {
      "0xexpired": makeVoucher(50),
      "0xvalid": makeVoucher(200),
    };
    const result = filterAndSelectVoucher(vouchers, 100);
    expect(result!.id).toBe("0xvalid");
  });

  it("picks first valid deterministically by voucher ID sort", () => {
    const vouchers = {
      "0xzzz": makeVoucher(200),
      "0xaaa": makeVoucher(300),
      "0xmmm": makeVoucher(250),
    };
    const result = filterAndSelectVoucher(vouchers, 100);
    // Lexicographic sort: 0xaaa < 0xmmm < 0xzzz
    expect(result!.id).toBe("0xaaa");
  });

  it("treats voucher expiring at current block as expired", () => {
    const vouchers = {
      "0xaaa": makeVoucher(100), // expiry === currentBlock
    };
    // expiry > currentBlock means 100 > 100 is false
    expect(filterAndSelectVoucher(vouchers, 100)).toBeNull();
  });

  it("works with currentBlock = 0 (no block info yet)", () => {
    const vouchers = {
      "0xaaa": makeVoucher(200),
    };
    const result = filterAndSelectVoucher(vouchers, 0);
    expect(result!.id).toBe("0xaaa");
  });
});

describe("blocksToHumanTime", () => {
  // Import the actual function
  it("converts blocks to human time", async () => {
    const { blocksToHumanTime } = await import("@/lib/block-time");

    expect(blocksToHumanTime(0)).toBe("<1 min");
    expect(blocksToHumanTime(10)).toBe("<1 min"); // 30s
    expect(blocksToHumanTime(20)).toBe("~1 min"); // 60s
    expect(blocksToHumanTime(100)).toBe("~5 min"); // 300s
    expect(blocksToHumanTime(1200)).toBe("~1h"); // 3600s
    expect(blocksToHumanTime(2400)).toBe("~2h"); // 7200s
  });
});
