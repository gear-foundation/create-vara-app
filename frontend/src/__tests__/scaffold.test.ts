import { describe, it, expect } from "vitest";
import {
  getTsType,
  primToTs,
  methodIcon,
  isSmallNumeric,
  isBigNumeric,
  isHexType,
  defaultValueStr,
} from "../../../scripts/scaffold-types";

// --- Mock type def builders ---

function prim(flags: Record<string, boolean>) {
  return { isPrimitive: true, asPrimitive: { ...flags } };
}

function opt(inner: any) {
  return { isOptional: true, asOptional: { def: inner } };
}

function vec(inner: any) {
  return { isVec: true, asVec: { def: inner } };
}

function struct(fields: Array<{ name: string; def: any }>) {
  return { isStruct: true, asStruct: { fields } };
}

function enumType(variants: Array<{ name: string; def?: any }>) {
  return {
    isEnum: true,
    asEnum: {
      variants: variants.map((v) => ({
        name: v.name,
        def: v.def ?? { isNull: true },
      })),
    },
  };
}

function fixedArr(inner: any, len: number) {
  return { isFixedSizeArray: true, asFixedSizeArray: { def: inner, len } };
}

function userDefined(name: string) {
  return { isUserDefined: true, asUserDefined: { name } };
}

function result(ok: any, err: any) {
  return { isResult: true, asResult: { ok: { def: ok }, err: { def: err } } };
}

function map(key: any, value: any) {
  return { isMap: true, asMap: { key: { def: key }, value: { def: value } } };
}

// --- primToTs ---

describe("primToTs", () => {
  it("maps str to string", () => {
    expect(primToTs({ isStr: true })).toBe("string");
  });

  it("maps char to string", () => {
    expect(primToTs({ isChar: true })).toBe("string");
  });

  it("maps bool to boolean", () => {
    expect(primToTs({ isBool: true })).toBe("boolean");
  });

  it("maps null to null", () => {
    expect(primToTs({ isNull: true })).toBe("null");
  });

  it("maps small integers to number", () => {
    expect(primToTs({ isU8: true })).toBe("number");
    expect(primToTs({ isU16: true })).toBe("number");
    expect(primToTs({ isU32: true })).toBe("number");
    expect(primToTs({ isI8: true })).toBe("number");
    expect(primToTs({ isI16: true })).toBe("number");
    expect(primToTs({ isI32: true })).toBe("number");
  });

  it("maps big integers to string", () => {
    expect(primToTs({ isU64: true })).toBe("string");
    expect(primToTs({ isU128: true })).toBe("string");
    expect(primToTs({ isU256: true })).toBe("string");
    expect(primToTs({ isI64: true })).toBe("string");
    expect(primToTs({ isI128: true })).toBe("string");
  });

  it("maps NonZero small to number", () => {
    expect(primToTs({ isNonZeroU8: true })).toBe("number");
    expect(primToTs({ isNonZeroU16: true })).toBe("number");
    expect(primToTs({ isNonZeroU32: true })).toBe("number");
  });

  it("maps NonZero big to string", () => {
    expect(primToTs({ isNonZeroU64: true })).toBe("string");
    expect(primToTs({ isNonZeroU128: true })).toBe("string");
    expect(primToTs({ isNonZeroU256: true })).toBe("string");
  });

  it("maps hex/address types to string", () => {
    expect(primToTs({ isActorId: true })).toBe("string");
    expect(primToTs({ isCodeId: true })).toBe("string");
    expect(primToTs({ isMessageId: true })).toBe("string");
    expect(primToTs({ isH256: true })).toBe("string");
    expect(primToTs({ isH160: true })).toBe("string");
  });

  it("falls back to unknown for unrecognized", () => {
    expect(primToTs({})).toBe("unknown");
  });
});

// --- getTsType ---

describe("getTsType", () => {
  it("handles null/undefined def", () => {
    expect(getTsType(null)).toBe("unknown");
    expect(getTsType(undefined)).toBe("unknown");
  });

  it("handles primitives", () => {
    expect(getTsType(prim({ isStr: true }))).toBe("string");
    expect(getTsType(prim({ isU32: true }))).toBe("number");
    expect(getTsType(prim({ isU64: true }))).toBe("string");
    expect(getTsType(prim({ isBool: true }))).toBe("boolean");
  });

  it("handles optional", () => {
    expect(getTsType(opt(prim({ isStr: true })))).toBe("string | null");
    expect(getTsType(opt(prim({ isU32: true })))).toBe("number | null");
  });

  it("handles vec", () => {
    expect(getTsType(vec(prim({ isStr: true })))).toBe("string[]");
    expect(getTsType(vec(prim({ isU32: true })))).toBe("number[]");
  });

  it("wraps complex optional inner types in parens", () => {
    // opt vec str -> (string[]) | null... actually string[] doesn't need parens
    // opt struct -> parens needed
    const optStruct = opt(struct([{ name: "a", def: prim({ isU32: true }) }]));
    expect(getTsType(optStruct)).toBe("({ a: number }) | null");
  });

  it("wraps complex vec inner types in parens", () => {
    // vec opt u32 -> (number | null)[]
    const vecOpt = vec(opt(prim({ isU32: true })));
    expect(getTsType(vecOpt)).toBe("(number | null)[]");
  });

  it("handles struct", () => {
    const s = struct([
      { name: "x", def: prim({ isU32: true }) },
      { name: "y", def: prim({ isStr: true }) },
    ]);
    expect(getTsType(s)).toBe("{ x: number; y: string }");
  });

  it("handles enum without payloads", () => {
    const e = enumType([{ name: "Red" }, { name: "Green" }, { name: "Blue" }]);
    expect(getTsType(e)).toBe('"Red" | "Green" | "Blue"');
  });

  it("falls back to unknown for enum with payloads", () => {
    const e = enumType([
      { name: "Ok", def: prim({ isU32: true }) },
      { name: "Err", def: prim({ isStr: true }) },
    ]);
    expect(getTsType(e)).toBe("unknown");
  });

  it("handles result as unknown", () => {
    expect(getTsType(result(prim({ isU32: true }), prim({ isStr: true })))).toBe("unknown");
  });

  it("handles map as unknown", () => {
    expect(getTsType(map(prim({ isStr: true }), prim({ isU32: true })))).toBe("unknown");
  });

  it("handles fixedSizeArray", () => {
    expect(getTsType(fixedArr(prim({ isU32: true }), 3))).toBe("number[]");
  });

  it("wraps complex fixedSizeArray inner types in parens", () => {
    const arr = fixedArr(opt(prim({ isU32: true })), 2);
    expect(getTsType(arr)).toBe("(number | null)[]");
  });

  it("handles userDefined by returning type name", () => {
    expect(getTsType(userDefined("MyStruct"))).toBe("MyStruct");
  });

  it("handles vec of userDefined", () => {
    expect(getTsType(vec(userDefined("StoredMessage")))).toBe("StoredMessage[]");
  });

  it("handles optional userDefined", () => {
    expect(getTsType(opt(userDefined("StateView")))).toBe("StateView | null");
  });

  it("handles nested opt opt u32", () => {
    expect(getTsType(opt(opt(prim({ isU32: true }))))).toBe("(number | null) | null");
  });
});

// --- methodIcon ---

describe("methodIcon", () => {
  it("returns ChatText for message-related methods", () => {
    expect(methodIcon("SendMessage")).toBe("ChatText");
    expect(methodIcon("PostMessage")).toBe("ChatText");
  });

  it("returns Clock for schedule/ping/delay methods", () => {
    expect(methodIcon("SchedulePing")).toBe("Clock");
    expect(methodIcon("HandlePing")).toBe("Clock");
    expect(methodIcon("SetDelay")).toBe("Clock");
  });

  it("returns PencilSimple for set/greeting methods", () => {
    expect(methodIcon("SetGreeting")).toBe("PencilSimple");
    expect(methodIcon("SetConfig")).toBe("PencilSimple");
  });

  it("returns PlusCircle for increment/count/add methods", () => {
    expect(methodIcon("Increment")).toBe("PlusCircle");
    expect(methodIcon("AddItem")).toBe("PlusCircle");
  });

  it("returns ArrowUp as default", () => {
    expect(methodIcon("DoSomething")).toBe("ArrowUp");
    expect(methodIcon("Transfer")).toBe("ArrowUp");
  });
});

// --- Helper functions ---

describe("isSmallNumeric", () => {
  it("recognizes small integer types", () => {
    expect(isSmallNumeric("u8")).toBe(true);
    expect(isSmallNumeric("u16")).toBe(true);
    expect(isSmallNumeric("u32")).toBe(true);
    expect(isSmallNumeric("i32")).toBe(true);
  });

  it("rejects big integers", () => {
    expect(isSmallNumeric("u64")).toBe(false);
    expect(isSmallNumeric("u128")).toBe(false);
  });
});

describe("isBigNumeric", () => {
  it("recognizes big integer types", () => {
    expect(isBigNumeric("u64")).toBe(true);
    expect(isBigNumeric("u128")).toBe(true);
    expect(isBigNumeric("u256")).toBe(true);
  });

  it("rejects small integers", () => {
    expect(isBigNumeric("u32")).toBe(false);
  });
});

describe("isHexType", () => {
  it("recognizes address types", () => {
    expect(isHexType("actor_id")).toBe(true);
    expect(isHexType("h256")).toBe(true);
    expect(isHexType("h160")).toBe(true);
  });

  it("rejects non-hex types", () => {
    expect(isHexType("str")).toBe(false);
  });
});

describe("defaultValueStr", () => {
  it("returns correct defaults", () => {
    expect(defaultValueStr("bool")).toBe("false");
    expect(defaultValueStr("str")).toBe('""');
    expect(defaultValueStr("u32")).toBe("0");
    expect(defaultValueStr("u64")).toBe('"0"');
    expect(defaultValueStr("actor_id")).toBe('""');
  });
});
