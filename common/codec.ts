import { AssertState } from "./assert.ts"
import { DecodeBuffer, EncodeBuffer } from "./buffer.ts"
import { Metadata } from "./metadata.ts"
import { ScaleAssertError, ScaleEncodeError } from "./util.ts"

export type Native<T extends AnyCodec> = T extends Codec<infer U> ? U : never

export function createCodec<T>(
  _codec:
    & ThisType<Codec<T>>
    & Pick<Codec<T>, "_encode" | "_decode" | "_assert" | "_staticSize" | "_metadata">,
): Codec<T> {
  const { _staticSize, _encode, _assert, _decode, _metadata } = _codec
  const codec: Codec<T> = {
    // @ts-ignore https://gist.github.com/tjjfvi/ea194c4fce76dacdd60a0943256332aa
    __proto__: Codec.prototype,
    _staticSize,
    _encode,
    _decode,
    _assert,
    _metadata,
  }
  return codec
}

type NoInfer<T> = T extends infer U ? U : never
export function withMetadata<T>(metadata: Metadata<NoInfer<T>>, codec: Codec<T>): Codec<T> {
  const result: Codec<T> = {
    // @ts-ignore https://gist.github.com/tjjfvi/ea194c4fce76dacdd60a0943256332aa
    __proto__: Codec.prototype,
    ...codec,
    _metadata: [...metadata as Metadata<T>, ...codec._metadata],
  }
  return result
}

const codecInspectCtx = new Map<Codec<any>, number | null>()
let codecInspectIdN = 0
const nodeCustomInspect = Symbol.for("nodejs.util.inspect.custom")
const denoCustomInspect = Symbol.for("Deno.customInspect")

abstract class _Codec {
  private [nodeCustomInspect](_0: unknown, _1: unknown, inspect: (value: unknown) => string) {
    return this._inspect(inspect)
  }

  private [denoCustomInspect](inspect: (value: unknown, opts: unknown) => string, opts: unknown) {
    return this._inspect((x) => inspect(x, opts))
  }

  // Properly handles circular codecs in the case of $.deferred
  private _inspect(inspect: (value: unknown) => string): string
  private _inspect<T>(this: Codec<T>, inspect: (value: unknown) => string): string {
    let id = codecInspectCtx.get(this)
    if (id !== undefined) {
      if (id === null) {
        codecInspectCtx.set(this, id = codecInspectIdN++)
      }
      return `$${id}`
    }
    try {
      codecInspectCtx.set(this, null)
      let content = ""
      for (const metadata of this._metadata) {
        if (metadata.type === "docs") {
          // TODO: print docs in inspect
        } else {
          if (metadata.type === "atomic") {
            content += metadata.name
          } else if (metadata.type === "factory") {
            content += `${metadata.name}(${inspect(metadata.args).replace(/^\[(?: (.+) |(.+))\]$/s, "$1$2")})`
          }
          break
        }
      }
      content ||= "?"
      id = codecInspectCtx.get(this)
      return id !== null ? `$${id} = ${content}` : content
    } finally {
      codecInspectCtx.delete(this)
      if (codecInspectCtx.size === 0) codecInspectIdN = 0
    }
  }
}

export interface AnyCodec extends _Codec {
  _staticSize: number
  _encode(buffer: EncodeBuffer, value: any): void
  _decode: (buffer: DecodeBuffer) => any
  _assert: (state: AssertState) => void
  _metadata: any

  encode(value: any): Uint8Array
  encodeAsync(value: any): Promise<Uint8Array>
  decode(array: Uint8Array): any
  assert(value: unknown): void
}

export abstract class Codec<in out T> extends _Codec implements AnyCodec {
  /** A static estimation of the size, which may be an under- or over-estimate */
  abstract _staticSize: number
  /** Encodes the value into the supplied buffer, which should have at least `_staticSize` free byte. */
  abstract _encode: (buffer: EncodeBuffer, value: T) => void
  /** Decodes the value from the supplied buffer */
  abstract _decode: (buffer: DecodeBuffer) => T
  /** Asserts that the value is valid for this codec */
  abstract _assert: (state: AssertState) => void
  /** An array with metadata representing the construction of this codec */
  abstract _metadata: Metadata<T>

  /** Encodes the value into a new Uint8Array (throws if async) */
  encode(value: T) {
    const buf = new EncodeBuffer(this._staticSize)
    this._encode(buf, value)
    if (buf.asyncCount) throw new ScaleEncodeError(this, value, "Attempted to synchronously encode an async codec")
    return buf.finish()
  }

  /** Asynchronously encodes the value into a new Uint8Array */
  async encodeAsync(value: T) {
    const buf = new EncodeBuffer(this._staticSize)
    this._encode(buf, value)
    return buf.finishAsync()
  }

  /** Decodes a value from the supplied Uint8Array */
  decode(array: Uint8Array) {
    const buf = new DecodeBuffer(array)
    return this._decode(buf)
  }

  /** Requires the codec to have an explicit type annotation; if it doesn't, use `$.assert` instead. */
  assert(value: unknown): asserts value is T {
    assert(this, value)
  }
}

/** Asserts that the value is valid for the specified codec */
export function assert<T>(codec: Codec<T>, value: unknown): asserts value is T {
  codec._assert(new AssertState(value))
}

export function is<T>(codec: Codec<T>, value: unknown): value is T {
  try {
    codec._assert(new AssertState(value))
    return true
  } catch (e) {
    if (e instanceof ScaleAssertError) {
      return false
    } else {
      throw e
    }
  }
}
