import { Timestamp } from 'firebase-admin/firestore'

export interface CustomMatchers<R = unknown> {
  toBeCloseToTimestamp(expect: Timestamp | undefined): R
}

declare global {
  namespace jest {
    interface Expect extends CustomMatchers {}
    interface Matchers<R> extends CustomMatchers<R> {}
    interface InverseAsymmetricMatchers extends CustomMatchers {}
  }
}
