import type { Status } from '@grpc/grpc-js/build/src/constants'

export class FirestoreEmulatorError extends Error {
  constructor(
    readonly code: Status,
    message: string,
  ) {
    super(message)
  }
}
