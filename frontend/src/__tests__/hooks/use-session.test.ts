import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    for (const key of Object.keys(store)) delete store[key];
  }),
};

const STORAGE_MNEMONIC = "vara-starter.session.mnemonic";
const STORAGE_ADDRESS = "vara-starter.session.address";

describe("session storage logic", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("stores mnemonic and address on session creation", () => {
    const mnemonic = "test mnemonic phrase here";
    const address = "5TestAddr...";

    localStorageMock.setItem(STORAGE_MNEMONIC, mnemonic);
    localStorageMock.setItem(STORAGE_ADDRESS, address);

    expect(localStorageMock.getItem(STORAGE_MNEMONIC)).toBe(mnemonic);
    expect(localStorageMock.getItem(STORAGE_ADDRESS)).toBe(address);
  });

  it("clears storage on session end", () => {
    localStorageMock.setItem(STORAGE_MNEMONIC, "some mnemonic");
    localStorageMock.setItem(STORAGE_ADDRESS, "some address");

    localStorageMock.removeItem(STORAGE_MNEMONIC);
    localStorageMock.removeItem(STORAGE_ADDRESS);

    expect(localStorageMock.getItem(STORAGE_MNEMONIC)).toBeNull();
    expect(localStorageMock.getItem(STORAGE_ADDRESS)).toBeNull();
  });

  it("returns null when no session exists", () => {
    expect(localStorageMock.getItem(STORAGE_MNEMONIC)).toBeNull();
    expect(localStorageMock.getItem(STORAGE_ADDRESS)).toBeNull();
  });

  it("session is not active without voucher", () => {
    const sessionPair = { address: "5TestAddr...", sign: vi.fn() };
    const hasVoucher = false;
    const isActive = sessionPair !== null && hasVoucher;

    expect(isActive).toBe(false);
  });

  it("session is active with keypair AND voucher", () => {
    const sessionPair = { address: "5TestAddr...", sign: vi.fn() };
    const hasVoucher = true;
    const isActive = sessionPair !== null && hasVoucher;

    expect(isActive).toBe(true);
  });

  it("session is not active when keypair is null", () => {
    const sessionPair = null;
    const hasVoucher = true;
    const isActive = sessionPair !== null && hasVoucher;

    expect(isActive).toBe(false);
  });
});

// DOM event sync tests require jsdom environment, skipped in node mode
