/// <reference types='codeceptjs' />
type steps_file = typeof import('./steps_file').default;
type battle = typeof import('./pages/battle.page').default;

declare namespace CodeceptJS {
  interface SupportObject { I: I, current: any, battle: battle }
  interface Methods extends Playwright {}
  interface I extends ReturnType<steps_file> {}
  namespace Translation {
    interface Actions {}
  }
}
