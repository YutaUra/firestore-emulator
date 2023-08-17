import { FirestoreServer } from '@firestore-emulator/server'
import type { EnvironmentContext } from '@jest/environment'
import { findFreePorts } from 'find-free-ports'
import { TestEnvironment } from 'jest-environment-node'

import type { FirestoreEmulatorEnvironmentOptions } from '../types'

export default class FirestoreEmulatorEnvironment extends TestEnvironment {
  private server: FirestoreServer

  constructor(
    config: FirestoreEmulatorEnvironmentOptions,
    context: EnvironmentContext,
  ) {
    super(config, context)
    this.server = new FirestoreServer()
  }

  override async setup() {
    await super.setup()

    let tryCount = 0
    while (tryCount < 50) {
      const [port] = await findFreePorts(1)
      if (!port) throw new Error('Could not find a free port')
      try {
        await this.server.start(port)
        this.global.emulator = {
          host: `0.0.0.0:${port}`,
          port,
          state: this.server.state,
        }
        return
      } catch (err) {
        if (!(err instanceof Error)) throw err
        if (!err.message.startsWith('No address added out of total')) throw err
      }
      tryCount++
    }
    throw new Error('Could not find a free port')
  }

  override async teardown() {
    this.server.stop()
    await super.teardown()
  }
}
