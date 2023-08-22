import type { Timestamp } from 'firebase-admin/firestore'

export interface CustomMatchers<R = unknown> {
  toBeCloseToTimestamp(expect: Timestamp | undefined): R
}

declare global {
  namespace jest {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Expect extends CustomMatchers {}
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Matchers<R> extends CustomMatchers<R> {}
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface InverseAsymmetricMatchers extends CustomMatchers {}
  }
}
