/// <reference types="codeceptjs" />
import { actor } from "codeceptjs"

// Standard CodeceptJS v4 actor factory.
//
// v4 is ESM-first: the file referenced by `include: { I: "./e2e/steps_file.ts" }`
// must expose a default export (the `def` command types `I` as
// `ReturnType<typeof import('./steps_file').default>`). Custom step methods can
// be appended to the object passed to `actor()`; `this` is the actor itself.
export default function (this: any) {
  return actor(this)
}
