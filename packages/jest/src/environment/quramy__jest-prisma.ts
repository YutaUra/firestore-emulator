import { FirestoreServer } from '@firestore-emulator/server'
import type {
  EnvironmentContext,
  JestEnvironmentConfig,
} from '@jest/environment'
import PrismaEnvironment from '@quramy/jest-prisma-node/environment'
import { findFreePorts } from 'find-free-ports'

import type { FirestoreEmulatorEnvironmentConfig } from '../types'

export default class FirestoreEmulatorPrismaEnvironment extends PrismaEnvironment {
  private server: FirestoreServer

  constructor(
    config: FirestoreEmulatorEnvironmentConfig & JestEnvironmentConfig,
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
