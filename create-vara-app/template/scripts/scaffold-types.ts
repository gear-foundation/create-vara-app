// IDL v2 adapter and type-mapping helpers shared by the scaffold generator and tests.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDef = any;

export interface AdaptedParam {
  name: string;
  def: AnyDef;
}

export interface AdaptedFunc {
  name: string;
  isQuery: boolean;
  params: AdaptedParam[];
  def: AnyDef;
  docs?: string;
}

export interface AdaptedType {
  name: string;
  def: AnyDef;
}

export interface AdaptedService {
  name: string;
  funcs: AdaptedFunc[];
}

export interface AdaptedProgram {
  services: AdaptedService[];
  types: AdaptedType[];
  getTypeByName(name: string): AdaptedType | undefined;
}

const PRIMITIVE_FLAGS: Record<string, string> = {
  "()": "isNull",
  bool: "isBool",
  char: "isChar",
  String: "isStr",
  str: "isStr",
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
  actor_id: "isActorId",
  CodeId: "isCodeId",
  MessageId: "isMessageId",
  H160: "isH160",
  H256: "isH256",
  U256: "isU256",
  NonZeroU8: "isNonZeroU8",
  NonZeroU16: "isNonZeroU16",
  NonZeroU32: "isNonZeroU32",
  NonZeroU64: "isNonZeroU64",
  NonZeroU128: "isNonZeroU128",
  NonZeroU256: "isNonZeroU256",
};

function primitiveDef(name: string): AnyDef | null {
  const flag = PRIMITIVE_FLAGS[name];
  return flag ? { isPrimitive: true, asPrimitive: { [flag]: true } } : null;
}

export function typeDeclToDef(typeDecl: AnyDef): AnyDef {
  if (!typeDecl) return { isPrimitive: true, asPrimitive: { isNull: true } };
  if (typeof typeDecl === "string") {
    return primitiveDef(typeDecl) ?? { isUserDefined: true, asUserDefined: { name: typeDecl } };
  }
  if (typeDecl.kind === "slice") return { isVec: true, asVec: { def: typeDeclToDef(typeDecl.item) } };
  if (typeDecl.kind === "array") {
    return {
      isFixedSizeArray: true,
      asFixedSizeArray: { def: typeDeclToDef(typeDecl.item), len: typeDecl.len },
    };
  }
  if (typeDecl.kind === "tuple") {
    if (typeDecl.types.length === 0) return primitiveDef("()");
    return {
      isStruct: true,
      asStruct: {
        fields: typeDecl.types.map((item: AnyDef, index: number) => ({
          name: `field${index}`,
          def: typeDeclToDef(item),
        })),
      },
    };
  }
  if (typeDecl.kind === "generic") {
    return { isUserDefined: true, asUserDefined: { name: typeDecl.name } };
  }
  if (typeDecl.kind === "named") {
    const generics = typeDecl.generics ?? [];
    if (typeDecl.name === "Option" && generics.length === 1) {
      return { isOptional: true, asOptional: { def: typeDeclToDef(generics[0]) } };
    }
    if ((typeDecl.name === "Vec" || typeDecl.name === "Array") && generics.length === 1) {
      return { isVec: true, asVec: { def: typeDeclToDef(generics[0]) } };
    }
    if (typeDecl.name === "Result" && generics.length === 2) {
      return {
        isResult: true,
        asResult: {
          ok: { def: typeDeclToDef(generics[0]) },
          err: { def: typeDeclToDef(generics[1]) },
        },
      };
    }
    return { isUserDefined: true, asUserDefined: { name: typeDecl.name } };
  }
  return { isUserDefined: true, asUserDefined: { name: "unknown" } };
}

function typeToAdapted(type: AnyDef): AdaptedType | null {
  if (!type?.name) return null;
  if (type.kind === "struct") {
    return {
      name: type.name,
      def: {
        isStruct: true,
        asStruct: {
          fields: (type.fields ?? []).map((field: AnyDef, index: number) => ({
            name: field.name ?? `field${index}`,
            def: typeDeclToDef(field.type),
          })),
        },
      },
    };
  }
  if (type.kind === "enum") {
    return {
      name: type.name,
      def: {
        isEnum: true,
        asEnum: {
          variants: (type.variants ?? []).map((variant: AnyDef) => ({
            name: variant.name,
            def: (variant.fields ?? []).length === 0
              ? primitiveDef("()")
              : {
                  isStruct: true,
                  asStruct: {
                    fields: variant.fields.map((field: AnyDef, index: number) => ({
                      name: field.name ?? `field${index}`,
                      def: typeDeclToDef(field.type),
                    })),
                  },
                },
          })),
        },
      },
    };
  }
  if (type.kind === "alias") {
    return { name: type.name, def: typeDeclToDef(type.target) };
  }
  return null;
}

export function adaptIdlV2(doc: AnyDef): AdaptedProgram {
  if (!doc || typeof doc !== "object" || !Array.isArray(doc.services)) {
    throw new Error("IDL v2 required: expected a Sails 1.0 IDL document with services.");
  }

  const serviceUnits = new Map<string, AnyDef>();
  for (const service of doc.services) {
    serviceUnits.set(service.name, service);
  }

  const exposed = doc.program?.services?.length
    ? doc.program.services.map((service: AnyDef) => serviceUnits.get(service.name)).filter(Boolean)
    : doc.services;

  if (exposed.length === 0) {
    throw new Error("IDL v2 required: no program services found.");
  }

  const adaptedTypes = [
    ...(doc.program?.types ?? []),
    ...exposed.flatMap((service: AnyDef) => service.types ?? []),
  ].map(typeToAdapted).filter(Boolean) as AdaptedType[];
  const typeByName = new Map(adaptedTypes.map((type) => [type.name, type]));

  return {
    services: exposed.map((service: AnyDef) => ({
      name: service.name,
      funcs: (service.funcs ?? []).map((func: AnyDef) => ({
        name: func.name,
        isQuery: func.kind === "query",
        params: (func.params ?? []).map((param: AnyDef) => ({
          name: param.name,
          def: typeDeclToDef(param.type),
        })),
        def: typeDeclToDef(func.output),
        docs: Array.isArray(func.docs) ? func.docs.join("\n") : undefined,
      })),
    })),
    types: adaptedTypes,
    getTypeByName(name: string) {
      return typeByName.get(name);
    },
  };
}

export function getPrimitiveLabel(prim: AnyDef): string {
  if (prim.isNull) return "null";
  if (prim.isBool) return "bool";
  if (prim.isChar) return "char";
  if (prim.isStr) return "str";
  if (prim.isU8) return "u8";
  if (prim.isU16) return "u16";
  if (prim.isU32) return "u32";
  if (prim.isU64) return "u64";
  if (prim.isU128) return "u128";
  if (prim.isI8) return "i8";
  if (prim.isI16) return "i16";
  if (prim.isI32) return "i32";
  if (prim.isI64) return "i64";
  if (prim.isI128) return "i128";
  if (prim.isActorId) return "actor_id";
  if (prim.isCodeId) return "code_id";
  if (prim.isMessageId) return "message_id";
  if (prim.isH256) return "h256";
  if (prim.isU256) return "u256";
  if (prim.isH160) return "h160";
  if (prim.isNonZeroU8) return "NonZeroU8";
  if (prim.isNonZeroU16) return "NonZeroU16";
  if (prim.isNonZeroU32) return "NonZeroU32";
  if (prim.isNonZeroU64) return "NonZeroU64";
  if (prim.isNonZeroU128) return "NonZeroU128";
  if (prim.isNonZeroU256) return "NonZeroU256";
  return "unknown";
}

export function getTypeLabel(def: AnyDef): string {
  if (!def) return "unknown";
  if (def.isPrimitive) return getPrimitiveLabel(def.asPrimitive);
  if (def.isOptional) return `opt ${getTypeLabel(def.asOptional.def)}`;
  if (def.isVec) return `vec ${getTypeLabel(def.asVec.def)}`;
  if (def.isStruct) {
    const fields = def.asStruct.fields
      .map((f: AnyDef) => `${f.name}: ${getTypeLabel(f.def)}`)
      .join(", ");
    return `{ ${fields} }`;
  }
  if (def.isEnum) {
    return def.asEnum.variants.map((v: AnyDef) => v.name).join(" | ");
  }
  if (def.isResult) {
    return `result<${getTypeLabel(def.asResult.ok.def)}, ${getTypeLabel(def.asResult.err.def)}>`;
  }
  if (def.isMap) {
    return `map<${getTypeLabel(def.asMap.key.def)}, ${getTypeLabel(def.asMap.value.def)}>`;
  }
  if (def.isFixedSizeArray) {
    return `[${getTypeLabel(def.asFixedSizeArray.def)}; ${def.asFixedSizeArray.len}]`;
  }
  if (def.isUserDefined) return def.asUserDefined.name;
  return "unknown";
}

export function primToTs(prim: AnyDef): string {
  if (prim.isStr || prim.isChar) return "string";
  if (prim.isBool) return "boolean";
  if (prim.isNull) return "null";
  if (prim.isU8 || prim.isU16 || prim.isU32 || prim.isI8 || prim.isI16 || prim.isI32) return "number";
  if (prim.isNonZeroU8 || prim.isNonZeroU16 || prim.isNonZeroU32) return "number";
  if (prim.isU64 || prim.isU128 || prim.isU256 || prim.isI64 || prim.isI128) return "bigint";
  if (prim.isNonZeroU64 || prim.isNonZeroU128 || prim.isNonZeroU256) return "bigint";
  if (prim.isActorId || prim.isCodeId || prim.isMessageId || prim.isH256 || prim.isH160) return "string";
  return "unknown";
}

export function getTsType(def: AnyDef): string {
  if (!def) return "unknown";
  if (def.isPrimitive) return primToTs(def.asPrimitive);
  if (def.isOptional) {
    const inner = getTsType(def.asOptional.def);
    return inner.includes("|") || inner.includes("{") ? `(${inner}) | null` : `${inner} | null`;
  }
  if (def.isVec) {
    const inner = getTsType(def.asVec.def);
    return inner.includes("|") || inner.includes("{") ? `(${inner})[]` : `${inner}[]`;
  }
  if (def.isStruct) {
    const fields = def.asStruct.fields
      .map((f: AnyDef) => `${f.name}: ${getTsType(f.def)}`)
      .join("; ");
    return `{ ${fields} }`;
  }
  if (def.isEnum) {
    const hasPayloads = def.asEnum.variants.some(
      (v: AnyDef) => v.def && !v.def.isNull && !(v.def.isPrimitive && v.def.asPrimitive?.isNull),
    );
    if (hasPayloads) return "unknown";
    return def.asEnum.variants.map((v: AnyDef) => `"${v.name}"`).join(" | ");
  }
  if (def.isResult || def.isMap) return "unknown";
  if (def.isFixedSizeArray) {
    const inner = getTsType(def.asFixedSizeArray.def);
    return inner.includes("|") || inner.includes("{") ? `(${inner})[]` : `${inner}[]`;
  }
  if (def.isUserDefined) return def.asUserDefined.name;
  return "unknown";
}

export function methodIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("message") || lower.includes("send") || lower.includes("chat")) return "ChatText";
  if (lower.includes("ping") || lower.includes("schedule") || lower.includes("delay")) return "Clock";
  if (lower.includes("greeting") || lower.includes("set")) return "PencilSimple";
  if (lower.includes("increment") || lower.includes("count") || lower.includes("add")) return "PlusCircle";
  return "ArrowUp";
}

export function isSmallNumeric(typeLabel: string): boolean {
  return ["u8", "u16", "u32", "i8", "i16", "i32"].includes(typeLabel);
}

export function isBigNumeric(typeLabel: string): boolean {
  return ["u64", "u128", "u256", "i64", "i128"].includes(typeLabel);
}

export function isHexType(typeLabel: string): boolean {
  return ["actor_id", "code_id", "message_id", "h256", "h160"].includes(typeLabel);
}

export function defaultValueStr(typeLabel: string): string {
  if (typeLabel === "bool") return "false";
  if (typeLabel === "str" || typeLabel === "char") return '""';
  if (isSmallNumeric(typeLabel)) return "0";
  if (isBigNumeric(typeLabel)) return '"0"';
  if (isHexType(typeLabel)) return '""';
  return '""';
}
