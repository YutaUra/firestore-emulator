import {
  FirestoreServer,
  type FirestoreState,
} from '@firestore-emulator/server'
import { findFreePorts } from 'find-free-ports'
import type { Environment } from 'vitest/environments'
import { builtinEnvironments } from 'vitest/environments'

declare global {
  // eslint-disable-next-line no-var
  var emulator: {
    host: string
    port: number
    state: FirestoreState
  }
}

export interface Options {
  'firestore-emulator'?: {
    baseEnv?: keyof typeof builtinEnvironments
  }
}

export default {
  name: 'firestore-emulator',
  async setup(global: typeof globalThis, options: Options = {}) {
    const supper = await builtinEnvironments[
      options['firestore-emulator']?.baseEnv ?? 'node'
    ].setup(global, options)
    const server = new FirestoreServer()

    let tryCount = 0
    while (tryCount < 50) {
      const [port] = await findFreePorts(1)
      if (!port) throw new Error('Could not find a free port')
      try {
        await server.start(port)
        global.emulator = {
          host: `0.0.0.0:${port}`,
          port,
          state: server.state,
        }
        return {
          async teardown() {
            server.stop()
            await supper.teardown(global)
          },
        }
      } catch (err) {
        if (!(err instanceof Error)) throw err
        if (!err.message.startsWith('No address added out of total')) throw err
      }
      tryCount++
    }
    throw new Error('Could not find a free port')
  },
  transformMode: 'ssr',
} satisfies Environment
