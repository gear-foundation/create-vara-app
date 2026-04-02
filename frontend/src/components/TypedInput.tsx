import { useState } from "react";
import { getTypeLabel } from "@/lib/idl-introspect";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TypeDef = any;

interface TypedInputProps {
  typeDef: TypeDef;
  value: unknown;
  onChange: (value: unknown) => void;
  label?: string;
  depth?: number;
  visited?: Set<string>;
  resolveType?: (name: string) => TypeDef | null;
}

/**
 * Recursive type-driven form renderer for ISailsTypeDef.
 * MVP: primitives + struct + optional. Unsupported types get JSON textarea fallback.
 */
export function TypedInput({
  typeDef,
  value,
  onChange,
  label,
  depth = 0,
  visited = new Set(),
  resolveType,
}: TypedInputProps) {
  // Depth guard: fall back to JSON textarea
  if (depth > 4 || !typeDef) {
    return (
      <JsonFallback label={label} typeDef={typeDef} value={value} onChange={onChange} />
    );
  }

  // UserDefined: cycle detection
  if (typeDef.isUserDefined) {
    const name = typeDef.asUserDefined.name;
    if (visited.has(name)) {
      return <JsonFallback label={label} typeDef={typeDef} value={value} onChange={onChange} />;
    }
    // Try to resolve the type via Sails instance
    if (resolveType) {
      const resolved = resolveType(name);
      if (resolved?.def) {
        return (
          <TypedInput
            typeDef={resolved.def}
            value={value}
            onChange={onChange}
            label={label ?? name}
            depth={depth + 1}
            visited={new Set([...visited, name])}
            resolveType={resolveType}
          />
        );
      }
    }
    return <JsonFallback label={label} typeDef={typeDef} value={value} onChange={onChange} />;
  }

  // Primitive types
  if (typeDef.isPrimitive) {
    return <PrimitiveInput typeDef={typeDef} value={value} onChange={onChange} label={label} />;
  }

  // Optional
  if (typeDef.isOptional) {
    return (
      <OptionalInput
        typeDef={typeDef}
        value={value}
        onChange={onChange}
        label={label}
        depth={depth}
        visited={visited}
        resolveType={resolveType}
      />
    );
  }

  // Struct
  if (typeDef.isStruct) {
    return (
      <StructInput
        typeDef={typeDef}
        value={value}
        onChange={onChange}
        label={label}
        depth={depth}
        visited={visited}
        resolveType={resolveType}
      />
    );
  }

  // Unsupported: vec, enum, result, map, fixedSizeArray
  return <JsonFallback label={label} typeDef={typeDef} value={value} onChange={onChange} />;
}

// --- Primitive Input ---

function PrimitiveInput({
  typeDef,
  value,
  onChange,
  label,
}: {
  typeDef: TypeDef;
  value: unknown;
  onChange: (v: unknown) => void;
  label?: string;
}) {
  const p = typeDef.asPrimitive;

  if (p.isNull) {
    return label ? (
      <div className="text-xs text-zinc-500">{label}: null</div>
    ) : null;
  }

  if (p.isBool) {
    return (
      <label className="flex items-center gap-2 text-xs text-zinc-300">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded bg-zinc-800 border-zinc-700"
        />
        {label || "bool"}
      </label>
    );
  }

  // Small integers
  if (p.isU8 || p.isU16 || p.isU32 || p.isI8 || p.isI16 || p.isI32) {
    return (
      <InputField
        label={label || getTypeLabel(typeDef)}
        type="number"
        value={String(value ?? 0)}
        onChange={(v) => onChange(Number(v))}
      />
    );
  }

  // BigInt integers (u64, u128, u256, i64, i128)
  if (p.isU64 || p.isU128 || p.isU256 || p.isI64 || p.isI128) {
    return (
      <InputField
        label={label || getTypeLabel(typeDef)}
        type="text"
        value={String(value ?? "0")}
        onChange={onChange}
        placeholder="0"
        mono
      />
    );
  }

  // Hex types (actor_id, code_id, message_id, h256, h160)
  if (p.isActorId || p.isCodeId || p.isMessageId || p.isH256 || p.isH160) {
    return (
      <InputField
        label={label || getTypeLabel(typeDef)}
        type="text"
        value={String(value ?? "")}
        onChange={onChange}
        placeholder="0x..."
        mono
      />
    );
  }

  // str, char, and everything else
  return (
    <InputField
      label={label || getTypeLabel(typeDef)}
      type="text"
      value={String(value ?? "")}
      onChange={onChange}
      maxLength={p.isChar ? 1 : undefined}
    />
  );
}

// --- Optional Input ---

function OptionalInput({
  typeDef,
  value,
  onChange,
  label,
  depth,
  visited,
  resolveType,
}: {
  typeDef: TypeDef;
  value: unknown;
  onChange: (v: unknown) => void;
  label?: string;
  depth: number;
  visited: Set<string>;
  resolveType?: (name: string) => TypeDef | null;
}) {
  const hasValue = value !== null && value !== undefined;

  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-xs text-zinc-400">
        <input
          type="checkbox"
          checked={hasValue}
          onChange={(e) => onChange(e.target.checked ? "" : null)}
          className="rounded bg-zinc-800 border-zinc-700"
        />
        {label || "optional"} (opt)
      </label>
      {hasValue && (
        <div className="ml-4">
          <TypedInput
            typeDef={typeDef.asOptional.def}
            value={value}
            onChange={onChange}
            depth={depth + 1}
            visited={visited}
            resolveType={resolveType}
          />
        </div>
      )}
    </div>
  );
}

// --- Struct Input ---

function StructInput({
  typeDef,
  value,
  onChange,
  label,
  depth,
  visited,
  resolveType,
}: {
  typeDef: TypeDef;
  value: unknown;
  onChange: (v: unknown) => void;
  label?: string;
  depth: number;
  visited: Set<string>;
  resolveType?: (name: string) => TypeDef | null;
}) {
  const fields = typeDef.asStruct.fields;
  const obj = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;

  return (
    <div className="space-y-2">
      {label && <div className="text-xs text-zinc-400 font-medium">{label}</div>}
      <div className="ml-2 pl-2 border-l border-zinc-800 space-y-2">
        {fields.map((f: { name: string; def: TypeDef }) => (
          <TypedInput
            key={f.name}
            typeDef={f.def}
            value={obj[f.name]}
            onChange={(v) => onChange({ ...obj, [f.name]: v })}
            label={f.name}
            depth={depth + 1}
            visited={visited}
            resolveType={resolveType}
          />
        ))}
      </div>
    </div>
  );
}

// --- JSON Fallback ---

function JsonFallback({
  label,
  typeDef,
  value,
  onChange,
}: {
  label?: string;
  typeDef: TypeDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const typeLabel = typeDef ? getTypeLabel(typeDef) : "unknown";
  const [text, setText] = useState(() => {
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value, null, 2) ?? "";
    } catch {
      return "";
    }
  });

  function handleChange(newText: string) {
    setText(newText);
    try {
      onChange(JSON.parse(newText));
    } catch {
      onChange(newText);
    }
  }

  return (
    <div className="space-y-1">
      <div className="text-xs text-zinc-500">
        {label ? `${label} ` : ""}
        <span className="text-zinc-600">({typeLabel})</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        rows={3}
        className="w-full px-2 py-1 rounded bg-zinc-800 text-zinc-200 text-xs font-mono border border-zinc-700 focus:border-emerald-500 focus:outline-none resize-y"
        placeholder={`JSON for ${typeLabel}`}
      />
    </div>
  );
}

// --- Shared Input Field ---

function InputField({
  label,
  type,
  value,
  onChange,
  placeholder,
  mono,
  maxLength,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  maxLength?: number;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-zinc-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`w-full px-2 py-1 rounded bg-zinc-800 text-zinc-200 text-xs border border-zinc-700 focus:border-emerald-500 focus:outline-none ${mono ? "font-mono" : ""}`}
      />
    </div>
  );
}
