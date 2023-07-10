// import * as $ from "https://deno.land/x/subshape/mod.ts";
import * as $ from "../mod.ts"
import { $interestingU8, $pet, InterestingU8 } from "./unions.eg.ts"

// TS can't (generally) infer recursive types, so we must explicitly type Person.

interface Person {
  name: string
  favoriteU8: InterestingU8
  pets: $.Output<typeof $pet>[]
  children: Person[]
}

const $person: $.Shape<Person> = $.object(
  $.field("name", $.str),
  $.field("favoriteU8", $interestingU8),
  $.field("pets", $.array($pet)),
  $.field("children", $.array($.deferred(() => $person))),
)
