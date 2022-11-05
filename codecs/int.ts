import { Codec, createCodec, metadata } from "../common/mod.ts";

export const u8 = createCodec<number>({
  _metadata: intMetadata(false, 8),
  _staticSize: 1,
  _encode(buffer, value) {
    buffer.array[buffer.index++] = value;
  },
  _decode(buffer) {
    return buffer.array[buffer.index++]!;
  },
});

type NumMethodKeys = { [K in keyof DataView]: K extends `get${infer N}` ? N : never }[keyof DataView];
type NumMethodVal<K extends NumMethodKeys> = ReturnType<DataView[`get${K}`]>;

function _int<K extends NumMethodKeys>(size: number, key: K): Codec<NumMethodVal<K>> {
  const getMethod = DataView.prototype["get" + key as never] as any;
  const setMethod = DataView.prototype["set" + key as never] as any;
  return createCodec({
    _metadata: intMetadata(key.includes("Int"), size * 8),
    _staticSize: size,
    _encode(buffer, value) {
      setMethod.call(buffer.view, buffer.index, value, true);
      buffer.index += size;
    },
    _decode(buffer) {
      const value = getMethod.call(buffer.view, buffer.index, true);
      buffer.index += size;
      return value;
    },
  });
}

export const i8 = _int(1, "Int8");
export const u16 = _int(2, "Uint16");
export const i16 = _int(2, "Int16");
export const u32 = _int(4, "Uint32");
export const i32 = _int(4, "Int32");
export const u64 = _int(8, "BigUint64");
export const i64 = _int(8, "BigInt64");

const _128 = (signed: boolean): Codec<bigint> => {
  const getMethod = DataView.prototype[signed ? "getBigInt64" : "getBigUint64"];
  return createCodec({
    _metadata: intMetadata(signed, 128),
    _staticSize: 16,
    _encode(buffer, value) {
      buffer.view.setBigInt64(buffer.index, value, true);
      buffer.view.setBigInt64(buffer.index + 8, value >> 64n, true);
      buffer.index += 16;
    },
    _decode(buffer) {
      const b = buffer.view.getBigUint64(buffer.index, true);
      const a = getMethod.call(buffer.view, buffer.index + 8, true);
      buffer.index += 16;
      return (a << 64n) | b;
    },
  });
};

export const u128 = _128(false);
export const i128 = _128(true);

const _256 = (signed: boolean): Codec<bigint> => {
  const getMethod = DataView.prototype[signed ? "getBigInt64" : "getBigUint64"];
  return createCodec({
    _metadata: intMetadata(signed, 256),
    _staticSize: 32,
    _encode(buffer, value) {
      buffer.view.setBigInt64(buffer.index, value, true);
      buffer.view.setBigInt64(buffer.index + 8, value >> 64n, true);
      buffer.view.setBigInt64(buffer.index + 16, value >> 128n, true);
      buffer.view.setBigInt64(buffer.index + 24, value >> 192n, true);
      buffer.index += 32;
    },
    _decode(buffer) {
      const d = buffer.view.getBigUint64(buffer.index, true);
      const c = buffer.view.getBigUint64(buffer.index + 8, true);
      const b = buffer.view.getBigUint64(buffer.index + 16, true);
      const a = getMethod.call(buffer.view, buffer.index + 24, true);
      buffer.index += 32;
      return (a << 192n) | (b << 128n) | (c << 64n) | d;
    },
  });
};

export const u256 = _256(false);
export const i256 = _256(true);

const intLookup = { u8, i8, u16, i16, u32, i32, u64, i64, u128, i128, u256, i256 };

export function int(signed: boolean, size: 8 | 16 | 32): Codec<number>;
export function int(signed: boolean, size: 64 | 128 | 256): Codec<bigint>;
export function int(signed: boolean, size: 8 | 16 | 32 | 64 | 128 | 256): Codec<number> | Codec<bigint>;
export function int(signed: boolean, size: 8 | 16 | 32 | 64 | 128 | 256): Codec<number | bigint>;
export function int(signed: boolean, size: 8 | 16 | 32 | 64 | 128 | 256): Codec<any> {
  const key = `${signed ? "i" : "u"}${size}` as const;
  return intLookup[key];
}

function intMetadata<T extends number | bigint>(signed: boolean, size: number) {
  return metadata<T>(
    metadata(`$.${signed ? "i" : "u"}${size}`),
    metadata("$.int", int as any, signed, size),
  );
}
