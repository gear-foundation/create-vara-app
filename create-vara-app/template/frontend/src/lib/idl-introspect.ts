/**
 * Runtime IDL introspection utilities for the DebugPanel ManualCallTab.
 * Uses the Sails class runtime API (sails.services[name].functions/queries).
 */

// Re-export ISailsTypeDef shape for consumers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TypeDef = any;
export type TypeResolver = (name: string) => TypeDef | null | undefined;

export type MethodKind = "command" | "query";

export interface MethodArg {
  name: string;
  typeDef: TypeDef;
}

export interface MethodDescriptor {
  serviceName: string;
  methodName: string;
  kind: MethodKind;
  args: MethodArg[];
  returnTypeDef: TypeDef;
  docs?: string;
}

function isV2TypeDecl(typeDef: TypeDef): boolean {
  return typeof typeDef === "string" || typeof typeDef?.kind === "string";
}

function primitiveDef(name: string): TypeDef | null {
  const flags: Record<string, string> = {
    "()": "isNull",
    bool: "isBool",
    char: "isChar",
    String: "isStr",
    u8: "isU8",
    u16: "isU16",
    u32: "isU32",
    u64: "isU64",
    u128: "isU128",
    i8: "isI8",
    i16: "isI16",
    i32: "isI32",
    i64: "isI64",
    i128: "isI128",
    ActorId: "isActorId",
    CodeId: "isCodeId",
    MessageId: "isMessageId",
    H160: "isH160",
    H256: "isH256",
    U256: "isU256",
  };
  const flag = flags[name];
  return flag ? { isPrimitive: true, asPrimitive: { [flag]: true } } : null;
}

export function normalizeTypeDef(typeDef: TypeDef): TypeDef {
  if (
    !typeDef ||
    typeDef.isPrimitive ||
    typeDef.isOptional ||
    typeDef.isVec ||
    typeDef.isStruct ||
    typeDef.isEnum ||
    typeDef.isUserDefined
  ) {
    return typeDef;
  }
  if (typeof typeDef === "string") {
    return primitiveDef(typeDef) ?? { isUserDefined: true, asUserDefined: { name: typeDef } };
  }
  if (typeDef.kind === "slice") return { isVec: true, asVec: { def: normalizeTypeDef(typeDef.item) } };
  if (typeDef.kind === "array") return { isVec: true, asVec: { def: normalizeTypeDef(typeDef.item) } };
  if (typeDef.kind === "tuple") {
    return {
      isStruct: true,
      asStruct: {
        fields: typeDef.types.map((item: TypeDef, i: number) => ({
          name: `field${i}`,
          def: normalizeTypeDef(item),
        })),
      },
    };
  }
  if (typeDef.kind === "generic") return { isUserDefined: true, asUserDefined: { name: typeDef.name } };
  if (typeDef.kind === "named") {
    const generics = typeDef.generics ?? [];
    if (typeDef.name === "Option" && generics.length === 1) {
      return { isOptional: true, asOptional: { def: normalizeTypeDef(generics[0]) } };
    }
    if ((typeDef.name === "Vec" || typeDef.name === "Array") && generics.length === 1) {
      return { isVec: true, asVec: { def: normalizeTypeDef(generics[0]) } };
    }
    return { isUserDefined: true, asUserDefined: { name: typeDef.name } };
  }
  return typeDef;
}

function typeUnitToDef(typeUnit: TypeDef): TypeDef | null {
  if (!typeUnit?.name) return null;
  if (typeUnit.kind === "struct") {
    return {
      isStruct: true,
      asStruct: {
        fields: (typeUnit.fields ?? []).map((field: TypeDef, index: number) => ({
          name: field.name ?? `field${index}`,
          def: normalizeTypeDef(field.type),
        })),
      },
    };
  }
  if (typeUnit.kind === "enum") {
    return {
      isEnum: true,
      asEnum: {
        variants: (typeUnit.variants ?? []).map((variant: TypeDef) => ({
          name: variant.name,
          def: (variant.fields ?? []).length === 0
            ? primitiveDef("()")
            : {
                isStruct: true,
                asStruct: {
                  fields: variant.fields.map((field: TypeDef, index: number) => ({
                    name: field.name ?? `field${index}`,
                    def: normalizeTypeDef(field.type),
                  })),
                },
              },
        })),
      },
    };
  }
  if (typeUnit.kind === "alias") return normalizeTypeDef(typeUnit.target);
  return null;
}

export function normalizeResolvedType(resolved: TypeDef): TypeDef | null {
  if (!resolved) return null;
  if (resolved.def) return normalizeTypeDef(resolved.def);
  return typeUnitToDef(resolved) ?? normalizeTypeDef(resolved);
}

function getV2TypeLabel(typeDef: TypeDef): string {
  if (typeof typeDef === "string") {
    if (typeDef === "()") return "null";
    if (typeDef === "String") return "str";
    if (typeDef === "ActorId") return "actor_id";
    if (typeDef === "CodeId") return "code_id";
    if (typeDef === "MessageId") return "message_id";
    return typeDef;
  }
  if (typeDef.kind === "slice") return `vec ${getV2TypeLabel(typeDef.item)}`;
  if (typeDef.kind === "array") return `[${getV2TypeLabel(typeDef.item)}; ${typeDef.len}]`;
  if (typeDef.kind === "tuple") return `{ ${typeDef.types.map((t: TypeDef, i: number) => `field${i}: ${getV2TypeLabel(t)}`).join(", ")} }`;
  if (typeDef.kind === "generic") return typeDef.name;
  if (typeDef.kind === "named") {
    const generics = typeDef.generics ?? [];
    if (typeDef.name === "Option" && generics.length === 1) return `opt ${getV2TypeLabel(generics[0])}`;
    if (typeDef.name === "Vec" && generics.length === 1) return `vec ${getV2TypeLabel(generics[0])}`;
    if (typeDef.name === "Result" && generics.length === 2) {
      return `result<${getV2TypeLabel(generics[0])}, ${getV2TypeLabel(generics[1])}>`;
    }
    return typeDef.name;
  }
  return "unknown";
}

/**
 * Extract all methods from a Sails instance's services.
 * Uses the runtime API: sails.services is Record<string, SailsService>
 * where each service has .functions (commands) and .queries maps.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractMethods(sails: any): MethodDescriptor[] {
  const methods: MethodDescriptor[] = [];
  const services = sails.services;

  for (const serviceName of Object.keys(services)) {
    const service = services[serviceName];

    // Queries
    if (service.queries) {
      for (const methodName of Object.keys(service.queries)) {
        const fn = service.queries[methodName];
        methods.push({
          serviceName,
          methodName,
          kind: "query",
          args: fn.args ?? [],
          returnTypeDef: fn.returnTypeDef,
          docs: fn.docs,
        });
      }
    }

    // Commands (functions)
    if (service.functions) {
      for (const methodName of Object.keys(service.functions)) {
        const fn = service.functions[methodName];
        methods.push({
          serviceName,
          methodName,
          kind: "command",
          args: fn.args ?? [],
          returnTypeDef: fn.returnTypeDef,
          docs: fn.docs,
        });
      }
    }
  }

  // Sort: queries first, then commands, alphabetical within each group
  methods.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "query" ? -1 : 1;
    return a.methodName.localeCompare(b.methodName);
  });

  return methods;
}

/**
 * Get a human-readable type label from an ISailsTypeDef.
 */
export function getTypeLabel(typeDef: TypeDef): string {
  if (!typeDef) return "unknown";
  if (isV2TypeDecl(typeDef)) return getV2TypeLabel(typeDef);

  if (typeDef.isPrimitive) {
    const p = typeDef.asPrimitive;
    if (p.isNull) return "null";
    if (p.isBool) return "bool";
    if (p.isChar) return "char";
    if (p.isStr) return "str";
    if (p.isU8) return "u8";
    if (p.isU16) return "u16";
    if (p.isU32) return "u32";
    if (p.isU64) return "u64";
    if (p.isU128) return "u128";
    if (p.isI8) return "i8";
    if (p.isI16) return "i16";
    if (p.isI32) return "i32";
    if (p.isI64) return "i64";
    if (p.isI128) return "i128";
    if (p.isActorId) return "actor_id";
    if (p.isCodeId) return "code_id";
    if (p.isMessageId) return "message_id";
    if (p.isH256) return "h256";
    if (p.isU256) return "u256";
    if (p.isH160) return "h160";
    return "primitive";
  }

  if (typeDef.isOptional) return `opt ${getTypeLabel(typeDef.asOptional.def)}`;
  if (typeDef.isVec) return `vec ${getTypeLabel(typeDef.asVec.def)}`;

  if (typeDef.isStruct) {
    const fields = typeDef.asStruct.fields;
    if (fields.length === 0) return "{}";
    const fLabels = fields
      .map((f: { name: string; def: TypeDef }) => `${f.name}: ${getTypeLabel(f.def)}`)
      .join(", ");
    return `{ ${fLabels} }`;
  }

  if (typeDef.isEnum) {
    return typeDef.asEnum.variants.map((v: { name: string }) => v.name).join(" | ");
  }

  if (typeDef.isResult) {
    return `result<${getTypeLabel(typeDef.asResult.ok.def)}, ${getTypeLabel(typeDef.asResult.err.def)}>`;
  }

  if (typeDef.isMap) {
    return `map<${getTypeLabel(typeDef.asMap.key.def)}, ${getTypeLabel(typeDef.asMap.value.def)}>`;
  }

  if (typeDef.isFixedSizeArray) {
    return `[${getTypeLabel(typeDef.asFixedSizeArray.def)}; ${typeDef.asFixedSizeArray.len}]`;
  }

  if (typeDef.isUserDefined) return typeDef.asUserDefined.name;

  return "unknown";
}

/**
 * Get a sensible default value for a type.
 */
export function defaultValue(
  rawTypeDef: TypeDef,
  visited = new Set<string>(),
  resolveType?: TypeResolver,
): unknown {
  if (!rawTypeDef) return null;
  const typeDef = normalizeTypeDef(rawTypeDef);

  if (typeDef.isPrimitive) {
    const p = typeDef.asPrimitive;
    if (p.isNull) return null;
    if (p.isBool) return false;
    if (p.isChar) return "";
    if (p.isStr) return "";
    if (p.isU8 || p.isU16 || p.isU32 || p.isI8 || p.isI16 || p.isI32) return 0;
    // BigInt types as string
    if (p.isU64 || p.isU128 || p.isU256 || p.isI64 || p.isI128) return "0";
    if (p.isActorId || p.isCodeId || p.isMessageId || p.isH256 || p.isH160) return "";
    return "";
  }

  if (typeDef.isOptional) return null;
  if (typeDef.isVec) return [];

  if (typeDef.isStruct) {
    const obj: Record<string, unknown> = {};
    for (const f of typeDef.asStruct.fields) {
      obj[f.name] = defaultValue(f.def, visited, resolveType);
    }
    return obj;
  }

  if (typeDef.isEnum) {
    const variants = typeDef.asEnum.variants;
    if (variants.length > 0) {
      return { [variants[0].name]: variants[0].def ? defaultValue(variants[0].def, visited, resolveType) : null };
    }
    return null;
  }

  if (typeDef.isUserDefined) {
    const name = typeDef.asUserDefined.name;
    if (visited.has(name)) return "";
    const resolved = normalizeResolvedType(resolveType?.(name));
    if (resolved) return defaultValue(resolved, new Set([...visited, name]), resolveType);
    return "";
  }

  // Fallback for result, map, fixedSizeArray
  return "";
}

/**
 * Coerce a form value to what Sails expects.
 */
export function coerceValue(
  rawTypeDef: TypeDef,
  raw: unknown,
  resolveType?: TypeResolver,
  visited = new Set<string>(),
): unknown {
  if (!rawTypeDef || raw === null || raw === undefined) return raw;
  const typeDef = normalizeTypeDef(rawTypeDef);

  if (typeDef.isPrimitive) {
    const p = typeDef.asPrimitive;
    if (p.isNull) return null;
    if (p.isBool) return Boolean(raw);
    if (p.isU8 || p.isU16 || p.isU32 || p.isI8 || p.isI16 || p.isI32) {
      return Number(raw);
    }
    // BigInt types
    if (p.isU64 || p.isU128 || p.isU256 || p.isI64 || p.isI128) {
      try {
        return BigInt(String(raw));
      } catch {
        return Number(raw);
      }
    }
    // String types
    return String(raw);
  }

  if (typeDef.isOptional) {
    if (raw === null) return null;
    return coerceValue(typeDef.asOptional.def, raw, resolveType, visited);
  }

  if (typeDef.isVec) {
    if (!Array.isArray(raw)) return raw;
    return raw.map((item) => coerceValue(typeDef.asVec.def, item, resolveType, visited));
  }

  if (typeDef.isStruct) {
    if (typeof raw !== "object" || raw === null) return raw;
    const obj: Record<string, unknown> = {};
    for (const f of typeDef.asStruct.fields) {
      obj[f.name] = coerceValue(f.def, (raw as Record<string, unknown>)[f.name], resolveType, visited);
    }
    return obj;
  }

  if (typeDef.isUserDefined) {
    const name = typeDef.asUserDefined.name;
    if (visited.has(name)) return raw;
    const resolved = normalizeResolvedType(resolveType?.(name));
    if (resolved) return coerceValue(resolved, raw, resolveType, new Set([...visited, name]));
    return raw;
  }

  return raw;
}

/**
 * BigInt-safe JSON.stringify for displaying results.
 */
export function safeJsonStringify(value: unknown): string {
  return JSON.stringify(
    value,
    (_, v) => (typeof v === "bigint" ? v.toString() : v),
    2,
  );
}
