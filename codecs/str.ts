import { Codec, createCodec, metadata, ScaleDecodeError } from "../common/mod.ts"
import { compact } from "./compact.ts"
import { u32 } from "./int.ts"

const compactU32 = compact(u32)

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()
export const str: Codec<string> = createCodec({
  _metadata: metadata("$.str"),
  _staticSize: compactU32._staticSize,
  _encode(buffer, value) {
    const array = textEncoder.encode(value)
    compactU32._encode(buffer, array.length)
    buffer.insertArray(array)
  },
  _decode(buffer) {
    const len = compactU32._decode(buffer)
    if (buffer.array.length < buffer.index + len) {
      throw new ScaleDecodeError(this, buffer, "Attempting to `str`-decode beyond bounds of input bytes")
    }
    const slice = buffer.array.subarray(buffer.index, buffer.index + len)
    buffer.index += len
    return textDecoder.decode(slice)
  },
  _assert(assert) {
    assert.typeof(this, "string")
  },
})
