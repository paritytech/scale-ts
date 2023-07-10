// import * as $ from "https://deno.land/x/subshape/mod.ts";
import * as $ from "../mod.ts"

export const $superhero = $.object(
  $.field("pseudonym", $.str),
  $.optionalField("secretIdentity", $.str),
  $.field("superpowers", $.array($.str)),
)

$superhero
// Shape<{
//   pseudonym: string;
//   secretIdentity?: string | undefined;
//   superpowers: string[];
// }>

class MyError extends Error {
  code
  constructor(code: number, message: string) {
    super(message)
    this.code = code
  }
}

export const $myError = $.instance(
  MyError,
  $.tuple($.u8, $.str), // Specify how to encode/decode constructor arguments
  (myError: MyError) => [myError.code, myError.message], // Specify how to extract arguments from an instance
)

$myError // Shape<MyError>
