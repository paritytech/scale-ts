import * as $ from "../../mod.ts";
import { testCodec } from "../../test-util.ts";

testCodec($.bool, [true, false]);
