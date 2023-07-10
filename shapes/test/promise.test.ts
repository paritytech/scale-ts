import * as $ from "../../mod.ts"
import { testInvalid, testShape } from "../../test-util.ts"

testShape($.promise($.u8), {
  0: () => prom(0),
  255: () => prom(255),
}, true)

testShape($.array($.promise($.u8)), {
  empty: () => [],
  single: () => [prom(0)],
  sequential: () => Array.from({ length: 256 }, (_, i) => prom(i)),
  times13: () => Array.from({ length: 256 }, (_, i) => prom(i * 13 % 256)),
}, true)

testShape($.promise($.array($.promise($.compact($.u32)))), {
  times13: () => Promise.resolve(Array.from({ length: 256 }, (_, i) => prom(i * 13 % 256))),
}, true)

testInvalid($.promise($.u8), [0])

function prom(n: number): Promise<number> {
  return new Promise((r) => setTimeout(() => r(n), n * 10))
}
