export * from './types'
export { default as FirestoreEmulatorEnvironment } from './environment/node'
import type { FirestoreState } from '@firestore-emulator/server'

declare global {
  // eslint-disable-next-line no-var
  var emulator: {
    host: string
    port: number
    state: FirestoreState
  }
}
