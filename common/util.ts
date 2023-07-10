import type { DecodeBuffer } from "./buffer.ts"
import type { AnyShape } from "./shape.ts"

export abstract class ScaleError extends Error {
  constructor(readonly shape: AnyShape, message: string) {
    super(message)
  }
}

export class ScaleAssertError extends ScaleError {
  override readonly name = "ScaleAssertError"
  constructor(shape: AnyShape, readonly value: unknown, message: string) {
    super(shape, message)
  }
}

export class ScaleEncodeError extends ScaleError {
  override readonly name = "ScaleEncodeError"
  constructor(shape: AnyShape, readonly value: unknown, message: string) {
    super(shape, message)
  }
}

export class ScaleDecodeError extends ScaleError {
  override readonly name = "ScaleDecodeError"
  constructor(shape: AnyShape, readonly buffer: DecodeBuffer, message: string) {
    super(shape, message)
  }
}

export type Expand<T> = T extends T ? { [K in keyof T]: T[K] } : never
export type U2I<U> = (U extends U ? (u: U) => 0 : never) extends (i: infer I) => 0 ? Extract<I, U> : never

type _Narrow<T, U> = [U] extends [T] ? U : Extract<T, U>
export type Narrow<T = unknown> =
  | _Narrow<T, 0 | number & {}>
  | _Narrow<T, 0n | bigint & {}>
  | _Narrow<T, "" | string & {}>
  | _Narrow<T, boolean>
  | _Narrow<T, symbol>
  | _Narrow<T, []>
  | _Narrow<T, { [_: PropertyKey]: Narrow }>
  | (T extends object ? { [K in keyof T]: Narrow<T[K]> } : never)
  | Extract<{} | null | undefined, T>
