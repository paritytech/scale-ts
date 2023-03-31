import { Codec, createCodec, metadata, ScaleDecodeError } from "../common/mod.ts"

export function option<T>($some: Codec<T>): Codec<T | undefined>
export function option<T, U>($some: Codec<T>, none: U): Codec<T | U>
export function option<T, U>($some: Codec<T>, none?: U): Codec<T | U> {
  if ($some._metadata.some((x) => x.factory === option && x.args[1] === none)) {
    throw new Error("Nested option codec will not roundtrip correctly")
  }
  return createCodec({
    _metadata: metadata("$.option", option<T, U>, $some, ...(none === undefined ? [] : [none!]) as [U]),
    _staticSize: 1 + $some._staticSize,
    _encode(buffer, value) {
      if ((buffer.array[buffer.index++] = +(value !== none))) {
        $some._encode(buffer, value as T)
      }
    },
    _decode(buffer) {
      switch (buffer.array[buffer.index++]) {
        case 0:
          return none as U
        case 1: {
          const value = $some._decode(buffer)
          if (value === none) {
            throw new ScaleDecodeError(this, buffer, "Some(None) will not roundtrip correctly")
          }
          return value
        }
        default:
          throw new ScaleDecodeError(this, buffer, "Option discriminant neither 0 nor 1")
      }
    },
    _assert(assert) {
      if (assert.value === none) return
      $some._assert(assert)
    },
  })
}
