import assert from 'assert'

import { getSeconds } from 'date-fns'
import type { App } from 'firebase-admin/app'
import { initializeApp, deleteApp } from 'firebase-admin/app'
import type {
  Firestore,
  Timestamp,
  WhereFilterOp,
} from 'firebase-admin/firestore'
import {
  initializeFirestore,
  GeoPoint,
  FieldValue,
  setLogFunction,
} from 'firebase-admin/firestore'

const LOGGING = false as boolean

expect.extend({
  toBeCloseToTimestamp(
    received: Timestamp | undefined,
    expected: Timestamp | undefined,
  ) {
    if (!received)
      return { message: () => 'received is undefined', pass: false }
    if (!expected)
      return { message: () => 'expected is undefined', pass: false }
    return {
      message: () =>
        `expected ${received.toDate().getTime() / 1000} to be close to ${
          expected.toDate().getTime() / 1000
        }`,
      pass:
        Math.abs(
          getSeconds(received.toDate()) - getSeconds(expected.toDate()),
        ) < 5,
    }
  },
})

let realEmulator: App
let firestoreEmulator: App
let realFirestore: Firestore
let firestore: Firestore
process.env['GCLOUD_PROJECT'] = 'test-project'
beforeAll(() => {
  realEmulator = initializeApp(
    { projectId: process.env['GCLOUD_PROJECT'] },
    'firebase-emulator',
  )
  firestoreEmulator = initializeApp(
    { projectId: process.env['GCLOUD_PROJECT'] },
    'firestore-emulator',
  )
  process.env['FIRESTORE_EMULATOR_HOST'] = 'localhost:8081'
  realFirestore = initializeFirestore(realEmulator)
  process.env['FIRESTORE_EMULATOR_HOST'] = emulator.host
  firestore = initializeFirestore(firestoreEmulator)

  if (LOGGING) {
    setLogFunction(console.log)
  }
})

afterAll(async () => {
  await Promise.all([
    realFirestore.terminate().then(() => deleteApp(realEmulator)),
    firestore.terminate().then(() => deleteApp(firestoreEmulator)),
  ])
})
beforeEach(async () => {
  emulator.state.clear()
  await fetch(
    `http://localhost:8081/emulator/v1/projects/${process.env['GCLOUD_PROJECT']}/databases/(default)/documents`,
    { method: 'DELETE' },
  )
})

const testCase = async <T>(
  handler: (
    db: Firestore,
    compare: (value: unknown) => void,
    isEmulator: boolean,
  ) => Promise<T>,
) => {
  const realCompares: unknown[] = []
  const emulatorCompares: unknown[] = []

  return await Promise.allSettled([
    handler(realFirestore, (value) => realCompares.push(value), false),
    handler(firestore, (value) => emulatorCompares.push(value), true),
  ]).finally(() => {
    expect(emulatorCompares.length).toBe(realCompares.length)
    for (let i = 0; i < emulatorCompares.length; i++) {
      expect(emulatorCompares[i]).toEqual(realCompares[i])
    }
  })
}

it(
  'can create document',
  async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      const result = await db.collection('users').doc('alice').create({
        name: 'Alice',
      })
      return result
    })
    if (realResult.status === 'rejected') throw realResult.reason
    if (emulatorResult.status === 'rejected') throw emulatorResult.reason
    expect(emulatorResult.value.writeTime).toBeCloseToTimestamp(
      realResult.value.writeTime,
    )
    expect(emulator.state.toJSON()).toMatchSnapshot()
    const [realDoc, emulatorDoc] = await testCase(async (db) => {
      const doc = await db.collection('users').doc('alice').get()
      return doc
    })
    if (realDoc.status === 'rejected') throw realDoc.reason
    if (emulatorDoc.status === 'rejected') throw emulatorDoc.reason
    expect(emulatorDoc.value.data()).toEqual(realDoc.value.data())
    expect(emulatorDoc.value.exists).toEqual(realDoc.value.exists)
    expect(emulatorDoc.value.createTime).toBeCloseToTimestamp(
      realDoc.value.createTime,
    )
    expect(emulatorDoc.value.updateTime).toBeCloseToTimestamp(
      realDoc.value.updateTime,
    )
  },
  1000 * 60,
)

describe('create with same id', () => {
  it('simple document', async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db.collection('users').doc('alice').create({
        name: 'Alice',
      })
      const result = await db.collection('users').doc('alice').create({
        name: 'Bob',
      })
      return result
    })
    assert(realResult.status === 'rejected')
    assert(emulatorResult.status === 'rejected')
    expect(emulatorResult.reason).toStrictEqual(realResult.reason)
  })

  it('nested document', async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db
        .collection('users')
        .doc('alice')
        .collection('posts')
        .doc('post-1')
        .create({
          name: 'Alice',
        })
      const result = await db
        .collection('users')
        .doc('alice')
        .collection('posts')
        .doc('post-1')
        .create({
          name: 'Bob',
        })
      return result
    })
    assert(realResult.status === 'rejected')
    assert(emulatorResult.status === 'rejected')
    expect(emulatorResult.reason).toStrictEqual(realResult.reason)
  })
})
it('can update document', async () => {
  const [realResult, emulatorResult] = await testCase(async (db) => {
    await db.collection('users').doc('alice').create({
      name: 'Alice',
    })
    const result = await db.collection('users').doc('alice').update({
      name: 'Bob',
    })
    return result
  })
  if (realResult.status === 'rejected') throw realResult.reason
  if (emulatorResult.status === 'rejected') throw emulatorResult.reason
  expect(emulatorResult.value.writeTime).toBeCloseToTimestamp(
    realResult.value.writeTime,
  )
  expect(emulator.state.toJSON()).toMatchSnapshot()
  const [realDoc, emulatorDoc] = await testCase(async (db) => {
    const doc = await db.collection('users').doc('alice').get()
    return doc
  })
  if (realDoc.status === 'rejected') throw realDoc.reason
  if (emulatorDoc.status === 'rejected') throw emulatorDoc.reason
  expect(emulatorDoc.value.data()).toEqual(realDoc.value.data())
  expect(emulatorDoc.value.exists).toEqual(realDoc.value.exists)
  expect(emulatorDoc.value.createTime).toBeCloseToTimestamp(
    realDoc.value.createTime,
  )
  expect(emulatorDoc.value.updateTime).toBeCloseToTimestamp(
    realDoc.value.updateTime,
  )
})
it('could not update document if it does not exist', async () => {
  const [realResult, emulatorResult] = await testCase(async (db) => {
    const result = await db.collection('users').doc('alice').update({
      name: 'Alice',
    })
    return result
  })
  assert(emulatorResult.status === 'rejected')
  assert(realResult.status === 'rejected')
  expect(emulatorResult.reason).toStrictEqual(realResult.reason)
})
it('can delete document', async () => {
  const [realCreateResult, emulatorCreateResult] = await testCase(
    async (db) => {
      await db.collection('users').doc('alice').create({
        name: 'Alice',
      })
      return db.collection('users').doc('alice').get()
    },
  )
  assert(realCreateResult.status === 'fulfilled')
  assert(emulatorCreateResult.status === 'fulfilled')
  expect(emulatorCreateResult.value.data()).toEqual(
    realCreateResult.value.data(),
  )
  expect(emulator.state.toJSON()).toMatchSnapshot()
  const [realDeleteResult, emulatorDeleteResult] = await testCase(
    async (db) => {
      await db.collection('users').doc('alice').delete()
      return db.collection('users').doc('alice').get()
    },
  )
  assert(realDeleteResult.status === 'fulfilled')
  assert(emulatorDeleteResult.status === 'fulfilled')
  expect(emulator.state.toJSON()).toMatchSnapshot()
  expect(emulatorDeleteResult.value.exists).toBe(realDeleteResult.value.exists)
  expect(emulatorDeleteResult.value.data()).toEqual(
    realDeleteResult.value.data(),
  )
  expect(emulatorDeleteResult.value.createTime).toBe(
    realDeleteResult.value.createTime,
  )
  expect(emulatorDeleteResult.value.updateTime).toBe(
    realDeleteResult.value.updateTime,
  )
})
it('can set document', async () => {
  const [realResult, emulatorResult] = await testCase(async (db) => {
    const result = await db.collection('users').doc('alice').set({
      name: 'Alice',
    })
    return result
  })
  assert(realResult.status === 'fulfilled')
  assert(emulatorResult.status === 'fulfilled')
  expect(emulatorResult.value.writeTime).toBeCloseToTimestamp(
    realResult.value.writeTime,
  )
  expect(emulator.state.toJSON()).toMatchSnapshot()
  const [realDoc, emulatorDoc] = await testCase(async (db) => {
    const doc = await db.collection('users').doc('alice').get()
    return doc
  })
  if (realDoc.status === 'rejected') throw realDoc.reason
  if (emulatorDoc.status === 'rejected') throw emulatorDoc.reason
  expect(emulatorDoc.value.data()).toEqual(realDoc.value.data())
  expect(emulatorDoc.value.exists).toEqual(realDoc.value.exists)
  expect(emulatorDoc.value.createTime).toBeCloseToTimestamp(
    realDoc.value.createTime,
  )
  expect(emulatorDoc.value.updateTime).toBeCloseToTimestamp(
    realDoc.value.updateTime,
  )
})
describe('field type', () => {
  it('string', async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db.collection('users').doc('alice').set({
        name: 'Alice',
      })
      return db.collection('users').doc('alice').get()
    })
    assert(realResult.status === 'fulfilled')
    assert(emulatorResult.status === 'fulfilled')
    expect(emulatorResult.value.data()).toEqual(realResult.value.data())
    expect(emulator.state.toJSON()).toMatchSnapshot()
  })
  it('number', async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db.collection('users').doc('alice').set({
        age: 20,
      })
      return db.collection('users').doc('alice').get()
    })
    assert(realResult.status === 'fulfilled')
    assert(emulatorResult.status === 'fulfilled')
    expect(emulatorResult.value.data()).toEqual(realResult.value.data())
    expect(emulator.state.toJSON()).toMatchSnapshot()
  })
  it('boolean', async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db.collection('users').doc('alice').set({
        isAdult: true,
      })
      return db.collection('users').doc('alice').get()
    })
    assert(realResult.status === 'fulfilled')
    assert(emulatorResult.status === 'fulfilled')
    expect(emulatorResult.value.data()).toEqual(realResult.value.data())
    expect(emulator.state.toJSON()).toMatchSnapshot()
  })
  it('null', async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db.collection('users').doc('alice').set({
        address: null,
      })
      return db.collection('users').doc('alice').get()
    })
    assert(realResult.status === 'fulfilled')
    assert(emulatorResult.status === 'fulfilled')
    expect(emulatorResult.value.data()).toEqual(realResult.value.data())
    expect(emulator.state.toJSON()).toMatchSnapshot()
  })
  it('array', async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db
        .collection('users')
        .doc('alice')
        .set({
          favoriteFruits: ['apple', 'banana'],
        })
      return db.collection('users').doc('alice').get()
    })
    assert(realResult.status === 'fulfilled')
    assert(emulatorResult.status === 'fulfilled')
    expect(emulatorResult.value.data()).toEqual(realResult.value.data())
    expect(emulator.state.toJSON()).toMatchSnapshot()
  })
  it('map', async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db
        .collection('users')
        .doc('alice')
        .set({
          address: {
            city: 'Tokyo',
            zipCode: '123-4567',
          },
        })
      return db.collection('users').doc('alice').get()
    })
    assert(realResult.status === 'fulfilled')
    assert(emulatorResult.status === 'fulfilled')
    expect(emulatorResult.value.data()).toEqual(realResult.value.data())
    expect(emulator.state.toJSON()).toMatchSnapshot()
  })
  it('timestamp', async () => {
    const date = new Date('2020-01-01T00:00:00.000Z')
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db.collection('users').doc('alice').set({
        createdAt: date,
      })
      return db.collection('users').doc('alice').get()
    })
    assert(realResult.status === 'fulfilled')
    assert(emulatorResult.status === 'fulfilled')
    expect(emulatorResult.value.data()).toEqual(realResult.value.data())
    expect(emulator.state.toJSON()).toMatchSnapshot()
  })
  it('geopoint', async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db
        .collection('users')
        .doc('alice')
        .set({
          location: new GeoPoint(35.681236, 139.767125),
        })
      return db.collection('users').doc('alice').get()
    })
    assert(realResult.status === 'fulfilled')
    assert(emulatorResult.status === 'fulfilled')
    expect(emulatorResult.value.data()).toEqual(realResult.value.data())
    expect(emulator.state.toJSON()).toMatchSnapshot()
  })
  it('reference', async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db
        .collection('users')
        .doc('alice')
        .set({
          friend: db.collection('users').doc('bob'),
        })
      return db.collection('users').doc('alice').get()
    })
    assert(realResult.status === 'fulfilled')
    assert(emulatorResult.status === 'fulfilled')
    // reference type cannot be compared, so convert to JSON and compare
    expect(JSON.stringify(emulatorResult.value.data())).toStrictEqual(
      JSON.stringify(realResult.value.data()),
    )
    expect(emulator.state.toJSON()).toMatchSnapshot()
  })
  it('map in map', async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db
        .collection('users')
        .doc('alice')
        .set({
          address: {
            zipCode: {
              postfix: '4567',
              prefix: '123',
            },
          },
        })
      return db.collection('users').doc('alice').get()
    })
    assert(realResult.status === 'fulfilled')
    assert(emulatorResult.status === 'fulfilled')
    expect(emulatorResult.value.data()).toEqual(realResult.value.data())
    expect(emulator.state.toJSON()).toMatchSnapshot()
  })
  it('map in array', async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db
        .collection('users')
        .doc('alice')
        .set({
          favoriteFruits: [
            {
              color: 'red',
              name: 'apple',
            },
            {
              color: 'yellow',
              name: 'banana',
            },
          ],
        })
      return db.collection('users').doc('alice').get()
    })
    assert(realResult.status === 'fulfilled')
    assert(emulatorResult.status === 'fulfilled')
    expect(emulatorResult.value.data()).toEqual(realResult.value.data())
    expect(emulator.state.toJSON()).toMatchSnapshot()
  })
})
describe('transaction', () => {
  it('set in transaction', async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db.runTransaction((transaction) => {
        transaction.set(db.collection('users').doc('alice'), {
          name: 'Alice',
        })
        return Promise.resolve()
      })
      return db.collection('users').doc('alice').get()
    })
    assert(realResult.status === 'fulfilled')
    assert(emulatorResult.status === 'fulfilled')
    expect(emulatorResult.value.data()).toEqual(realResult.value.data())
    expect(emulator.state.toJSON()).toMatchSnapshot()
  })
  it('update in transaction', async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db.collection('users').doc('alice').set({
        age: 20,
        name: 'Alice',
      })
      await db.runTransaction((transaction) => {
        transaction.update(db.collection('users').doc('alice'), {
          age: 21,
        })
        return Promise.resolve()
      })
      return db.collection('users').doc('alice').get()
    })
    assert(realResult.status === 'fulfilled')
    assert(emulatorResult.status === 'fulfilled')
    expect(emulatorResult.value.data()).toEqual(realResult.value.data())
    expect(emulator.state.toJSON()).toMatchSnapshot()
  })
  it('delete in transaction', async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db.collection('users').doc('alice').set({
        age: 20,
        name: 'Alice',
      })
      const current = await db.collection('users').doc('alice').get()
      expect(current.exists).toEqual(true)
      await db.runTransaction((transaction) => {
        transaction.delete(db.collection('users').doc('alice'))
        return Promise.resolve()
      })
      return db.collection('users').doc('alice').get()
    })
    assert(realResult.status === 'fulfilled')
    assert(emulatorResult.status === 'fulfilled')
    expect(emulatorResult.value.exists).toEqual(realResult.value.exists)
    expect(emulator.state.toJSON()).toMatchSnapshot()
  })
  it('get and set in transaction', async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db.collection('users').doc('alice').set({
        age: 20,
        name: 'Alice',
      })
      await db.runTransaction(async (transaction) => {
        const current = await transaction.get(
          db.collection('users').doc('alice'),
        )
        const age = current.data()?.['age'] as number
        transaction.set(
          db.collection('users').doc('alice'),
          {
            age: age + 1,
          },
          { merge: true },
        )
      })
      return db.collection('users').doc('alice').get()
    })
    assert(realResult.status === 'fulfilled')
    assert(emulatorResult.status === 'fulfilled')
    expect(emulatorResult.value.data()).toEqual(realResult.value.data())
    expect(emulator.state.toJSON()).toMatchSnapshot()
  })
})

describe('FieldValue', () => {
  it('serverTimestamp', async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db.collection('users').doc('alice').set({
        createdAt: FieldValue.serverTimestamp(),
        name: 'Alice',
      })

      return db.collection('users').doc('alice').get()
    })
    assert(realResult.status === 'fulfilled')
    assert(emulatorResult.status === 'fulfilled')
    expect(emulatorResult.value.data()?.['createdAt']).toBeCloseToTimestamp(
      realResult.value.data()?.['createdAt'] as Timestamp,
    )
  })

  it('arrayUnion', async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db
        .collection('users')
        .doc('alice')
        .set({
          favoriteFruits: ['apple', { name: 'banana' }],
          name: 'Alice',
        })

      await db
        .collection('users')
        .doc('alice')
        .update({
          favoriteFruits: FieldValue.arrayUnion(
            'orange',
            { name: 'grape' },
            { name: 'banana' },
            'apple',
          ),
        })

      return db.collection('users').doc('alice').get()
    })
    assert(realResult.status === 'fulfilled')
    assert(emulatorResult.status === 'fulfilled')
    expect(emulatorResult.value.data()).toEqual(realResult.value.data())
    expect(emulator.state.toJSON()).toMatchSnapshot()
  })

  it('arrayRemove', async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db
        .collection('users')
        .doc('alice')
        .set({
          favoriteFruits: [
            'apple',
            'banana',
            { name: 'orange' },
            { name: 'grape' },
          ],
          name: 'Alice',
        })

      await db
        .collection('users')
        .doc('alice')
        .update({
          favoriteFruits: FieldValue.arrayRemove('banana', { name: 'orange' }),
        })

      return db.collection('users').doc('alice').get()
    })
    assert(realResult.status === 'fulfilled')
    assert(emulatorResult.status === 'fulfilled')
    expect(emulatorResult.value.data()).toEqual(realResult.value.data())
    expect(emulator.state.toJSON()).toMatchSnapshot()
  })

  it('increment', async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db.collection('users').doc('alice').set({
        age: 20,
        name: 'Alice',
      })

      await db
        .collection('users')
        .doc('alice')
        .update({
          age: FieldValue.increment(1),
        })

      return db.collection('users').doc('alice').get()
    })
    assert(realResult.status === 'fulfilled')
    assert(emulatorResult.status === 'fulfilled')
    expect(emulatorResult.value.data()).toEqual(realResult.value.data())
    expect(emulator.state.toJSON()).toMatchSnapshot()
  })
})

describe('nested collection', () => {
  it('set', async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db
        .collection('users')
        .doc('alice')
        .collection('posts')
        .doc('post1')
        .set({
          body: 'World',
          title: 'Hello',
        })

      return db
        .collection('users')
        .doc('alice')
        .collection('posts')
        .doc('post1')
        .get()
    })
    assert(realResult.status === 'fulfilled')
    if (emulatorResult.status === 'rejected') throw emulatorResult.reason
    expect(emulatorResult.value.data()).toEqual(realResult.value.data())
    expect(emulatorResult.value.ref.path).toEqual(realResult.value.ref.path)
    expect(emulator.state.toJSON()).toMatchSnapshot()
  })
})

describe('query', () => {
  describe('where', () => {
    describe('single where', () => {
      it.each`
        operator                | testName                     | values                                                                          | compareValue
        ${'=='}                 | ${'array and array'}         | ${[['apple', 'banana'], ['banana', 'orange']]}                                  | ${['apple', 'banana']}
        ${'=='}                 | ${'map and map'}             | ${[{ age: 20, name: 'Alice' }, { age: 21, name: 'Bob' }]}                       | ${{ age: 20, name: 'Alice' }}
        ${'=='}                 | ${'timestamp and timestamp'} | ${[new Date('2020-01-01T00:00:00.000Z'), new Date('2020-01-02T00:00:00.000Z')]} | ${new Date('2020-01-01T00:00:00.000Z')}
        ${'=='}                 | ${'geopoint and geopoint'}   | ${[new GeoPoint(35.681236, 139.767125), new GeoPoint(35.681236, 139.767125)]}   | ${new GeoPoint(35.681236, 139.767125)}
        ${'<'}                  | ${'string and string'}       | ${['Alice', 'Bob']}                                                             | ${'Bob'}
        ${'<'}                  | ${'string and number'}       | ${['Alice', 20]}                                                                | ${21}
        ${'<'}                  | ${'number and number'}       | ${[20, 21]}                                                                     | ${21}
        ${'<'}                  | ${'number and string'}       | ${[20, 'Alice']}                                                                | ${'Bob'}
        ${'<'}                  | ${'timestamp and timestamp'} | ${[new Date('2020-01-01T00:00:00.000Z'), new Date('2020-01-02T00:00:00.000Z')]} | ${new Date('2020-01-02T00:00:00.000Z')}
        ${'<='}                 | ${'string and string'}       | ${['Alice', 'Bob']}                                                             | ${'Bob'}
        ${'<='}                 | ${'string and number'}       | ${['Alice', 20]}                                                                | ${21}
        ${'<='}                 | ${'number and number'}       | ${[20, 21]}                                                                     | ${21}
        ${'<='}                 | ${'number and string'}       | ${[20, 'Alice']}                                                                | ${'Bob'}
        ${'<='}                 | ${'timestamp and timestamp'} | ${[new Date('2020-01-01T00:00:00.000Z'), new Date('2020-01-02T00:00:00.000Z')]} | ${new Date('2020-01-02T00:00:00.000Z')}
        ${'>'}                  | ${'string and string'}       | ${['Alice', 'Bob']}                                                             | ${'Alice'}
        ${'>'}                  | ${'string and number'}       | ${['Alice', 20]}                                                                | ${19}
        ${'>'}                  | ${'number and number'}       | ${[20, 21]}                                                                     | ${19}
        ${'>'}                  | ${'number and string'}       | ${[20, 'Alice']}                                                                | ${'Alic'}
        ${'>'}                  | ${'timestamp and timestamp'} | ${[new Date('2020-01-01T00:00:00.000Z'), new Date('2020-01-02T00:00:00.000Z')]} | ${new Date('2020-01-01T00:00:00.000Z')}
        ${'>'}                  | ${'geopoint and geopoint'}   | ${[new GeoPoint(35.681236, 139.767125), new GeoPoint(35.681236, 139.767125)]}   | ${new GeoPoint(35.681236, 139.767125)}
        ${'>'}                  | ${'geopoint and geopoint'}   | ${[new GeoPoint(35.681236, 139.767125), new GeoPoint(35.681236, 139.767125)]}   | ${new GeoPoint(35.681235, 139.767125)}
        ${'>'}                  | ${'geopoint and geopoint'}   | ${[new GeoPoint(35.681236, 139.767125), new GeoPoint(35.681236, 139.767125)]}   | ${new GeoPoint(35.681236, 139.767124)}
        ${'>'}                  | ${'geopoint and geopoint'}   | ${[new GeoPoint(35.681236, 139.767125), new GeoPoint(35.681236, 139.767125)]}   | ${new GeoPoint(35.681235, 139.767124)}
        ${'>='}                 | ${'string and string'}       | ${['Alice', 'Bob']}                                                             | ${'Alice'}
        ${'>='}                 | ${'string and number'}       | ${['Alice', 20]}                                                                | ${19}
        ${'>='}                 | ${'number and number'}       | ${[20, 21]}                                                                     | ${19}
        ${'>='}                 | ${'number and string'}       | ${[20, 'Alice']}                                                                | ${'Alice'}
        ${'>='}                 | ${'timestamp and timestamp'} | ${[new Date('2020-01-01T00:00:00.000Z'), new Date('2020-01-02T00:00:00.000Z')]} | ${new Date('2019-12-31T00:00:00.000Z')}
        ${'array-contains'}     | ${'array and string'}        | ${[['apple', 'banana'], ['banana', 'orange']]}                                  | ${'apple'}
        ${'array-contains'}     | ${'array and map'}           | ${[['apple', { name: 'orange' }], ['banana', { name: 'apple' }]]}               | ${{ name: 'apple' }}
        ${'array-contains-any'} | ${'array and array'}         | ${[['apple', 'banana'], ['banana', 'orange'], ['banana', 'grape']]}             | ${['apple', 'orange']}
        ${'in'}                 | ${'string and array'}        | ${['Alice', 'Bob']}                                                             | ${['Alice']}
        ${'in'}                 | ${'number and array'}        | ${[20, 21, 23]}                                                                 | ${[20, 23]}
        ${'not-in'}             | ${'string and array'}        | ${['Alice', 'Bob']}                                                             | ${['Alice']}
        ${'not-in'}             | ${'number and array'}        | ${[20, 21, 23]}                                                                 | ${[20, 23]}
      `(`$operator for $testName`, async (context) => {
        const { operator, values, compareValue } = context as {
          compareValue: unknown
          operator: WhereFilterOp
          values: unknown[]
        }
        const [realResult, emulatorResult] = await testCase(async (db) => {
          for (let i = 0; i < values.length; i++) {
            const value = values[i]
            await db
              .collection('values')
              .doc(`${i + 1}`)
              .set({
                value,
              })
          }

          const result = await db
            .collection('values')
            .where('value', operator, compareValue)
            .get()
          return result
        })
        assert(realResult.status === 'fulfilled')
        assert(emulatorResult.status === 'fulfilled')
        expect(emulatorResult.value.docs.map((doc) => doc.data())).toEqual(
          realResult.value.docs.map((doc) => doc.data()),
        )
      })
    })

    describe('multiple where', () => {
      describe('multiple where for single field', () => {
        it('== and ==', async () => {
          const [realResult, emulatorResult] = await testCase(async (db) => {
            await db.collection('users').doc('alice').set({
              age: 20,
              name: 'Alice',
            })
            await db.collection('users').doc('bob').set({
              age: 21,
              name: 'Bob',
            })
            await db.collection('users').doc('charlie').set({
              age: 21,
              name: 'Charlie',
            })
            const result = await db
              .collection('users')
              .where('age', '==', 21)
              .where('age', '>=', 20)
              .get()
            return result
          })
          assert(realResult.status === 'fulfilled')
          assert(emulatorResult.status === 'fulfilled')
          expect(emulatorResult.value.docs.map((doc) => doc.data())).toEqual(
            realResult.value.docs.map((doc) => doc.data()),
          )
        })

        it('== and !=', async () => {
          const [realResult, emulatorResult] = await testCase(async (db) => {
            await db.collection('users').doc('alice').set({
              age: 20,
              name: 'Alice',
            })
            await db.collection('users').doc('bob').set({
              age: 21,
              name: 'Bob',
            })
            await db.collection('users').doc('charlie').set({
              age: 21,
              name: 'Charlie',
            })
            const result = await db
              .collection('users')
              .where('age', '==', 21)
              .where('age', '!=', 20)
              .get()
            return result
          })
          assert(realResult.status === 'fulfilled')
          assert(emulatorResult.status === 'fulfilled')
          expect(emulatorResult.value.docs.map((doc) => doc.data())).toEqual(
            realResult.value.docs.map((doc) => doc.data()),
          )
        })
      })

      describe('multiple where for multiple fields', () => {
        it('== and ==', async () => {
          const [realResult, emulatorResult] = await testCase(async (db) => {
            await db.collection('users').doc('alice').set({
              age: 20,
              name: 'Alice',
            })
            await db.collection('users').doc('bob').set({
              age: 21,
              name: 'Bob',
            })
            await db.collection('users').doc('charlie').set({
              age: 21,
              name: 'Charlie',
            })
            const result = await db
              .collection('users')
              .where('age', '==', 21)
              .where('name', '==', 'Bob')
              .get()
            return result
          })
          assert(realResult.status === 'fulfilled')
          assert(emulatorResult.status === 'fulfilled')
          expect(emulatorResult.value.docs.map((doc) => doc.data())).toEqual(
            realResult.value.docs.map((doc) => doc.data()),
          )
        })
      })
    })
  })

  describe('limit', () => {
    it('limit', async () => {
      const [realResult, emulatorResult] = await testCase(async (db) => {
        await db.collection('users').doc('alice').set({
          name: 'Alice',
        })
        await db.collection('users').doc('bob').set({
          name: 'Bob',
        })
        await db.collection('users').doc('charlie').set({
          name: 'Charlie',
        })
        const result = await db.collection('users').limit(2).get()
        return result
      })
      assert(realResult.status === 'fulfilled')
      assert(emulatorResult.status === 'fulfilled')
      expect(emulatorResult.value.docs.map((doc) => doc.data())).toEqual(
        realResult.value.docs.map((doc) => doc.data()),
      )
    })
  })

  describe('orderBy', () => {
    it('orderBy string asc', async () => {
      const [realResult, emulatorResult] = await testCase(async (db) => {
        await db.collection('users').doc('alice').set({
          name: 'Alice',
        })
        await db.collection('users').doc('bob').set({
          name: 'Bob',
        })
        await db.collection('users').doc('charlie').set({
          name: 'Charlie',
        })
        const result = await db.collection('users').orderBy('name', 'asc').get()
        return result
      })
      assert(realResult.status === 'fulfilled')
      assert(emulatorResult.status === 'fulfilled')
      expect(emulatorResult.value.docs.map((doc) => doc.data())).toEqual(
        realResult.value.docs.map((doc) => doc.data()),
      )
    })
    it('orderBy string desc', async () => {
      const [realResult, emulatorResult] = await testCase(async (db) => {
        await db.collection('users').doc('alice').set({
          name: 'Alice',
        })
        await db.collection('users').doc('bob').set({
          name: 'Bob',
        })
        await db.collection('users').doc('charlie').set({
          name: 'Charlie',
        })
        const result = await db
          .collection('users')
          .orderBy('name', 'desc')
          .get()
        return result
      })
      assert(realResult.status === 'fulfilled')
      assert(emulatorResult.status === 'fulfilled')
      expect(emulatorResult.value.docs.map((doc) => doc.data())).toEqual(
        realResult.value.docs.map((doc) => doc.data()),
      )
    })
    it('orderBy Timestamp asc', async () => {
      const [realResult, emulatorResult] = await testCase(async (db) => {
        await db
          .collection('users')
          .doc('bob')
          .set({
            createdAt: new Date('2020-01-02T00:00:00.000Z'),
            name: 'Bob',
          })
        await db
          .collection('users')
          .doc('alice')
          .set({
            createdAt: new Date('2020-01-01T00:00:00.000Z'),
            name: 'Alice',
          })
        await db
          .collection('users')
          .doc('charlie')
          .set({
            createdAt: new Date('2020-01-03T00:00:00.000Z'),
            name: 'Charlie',
          })
        const result = await db
          .collection('users')
          .orderBy('createdAt', 'asc')
          .get()
        return result
      })
      assert(realResult.status === 'fulfilled')
      assert(emulatorResult.status === 'fulfilled')
      expect(emulatorResult.value.docs.map((doc) => doc.data())).toEqual(
        realResult.value.docs.map((doc) => doc.data()),
      )
    })
    it('orderBy Timestamp desc', async () => {
      const [realResult, emulatorResult] = await testCase(async (db) => {
        await db
          .collection('users')
          .doc('bob')
          .set({
            createdAt: new Date('2020-01-02T00:00:00.000Z'),
            name: 'Bob',
          })
        await db
          .collection('users')
          .doc('alice')
          .set({
            createdAt: new Date('2020-01-01T00:00:00.000Z'),
            name: 'Alice',
          })
        await db
          .collection('users')
          .doc('charlie')
          .set({
            createdAt: new Date('2020-01-03T00:00:00.000Z'),
            name: 'Charlie',
          })
        const result = await db
          .collection('users')
          .orderBy('createdAt', 'desc')
          .get()
        return result
      })
      assert(realResult.status === 'fulfilled')
      assert(emulatorResult.status === 'fulfilled')
      expect(emulatorResult.value.docs.map((doc) => doc.data())).toEqual(
        realResult.value.docs.map((doc) => doc.data()),
      )
    })

    it('multiple orderBy', async () => {
      const [realResult, emulatorResult] = await testCase(async (db) => {
        await db.collection('users').doc('alice').set({
          age: 21,
          name: 'Alice',
        })
        await db.collection('users').doc('bob').set({
          age: 20,
          name: 'Alice',
        })
        await db.collection('users').doc('charlie').set({
          age: 20,
          name: 'Bob',
        })
        const result = await db
          .collection('users')
          .orderBy('name', 'desc')
          .orderBy('age', 'asc')
          .get()
        return result
      })
      assert(realResult.status === 'fulfilled')
      assert(emulatorResult.status === 'fulfilled')
      expect(emulatorResult.value.docs.map((doc) => doc.data())).toEqual(
        realResult.value.docs.map((doc) => doc.data()),
      )
    })
  })

  describe('complex query', () => {
    describe('where and limit', () => {
      it('== and limit', async () => {
        const [realResult, emulatorResult] = await testCase(async (db) => {
          await db.collection('users').doc('alice').set({
            age: 20,
            name: 'Alice',
          })
          await db.collection('users').doc('bob').set({
            age: 21,
            name: 'Bob',
          })
          await db.collection('users').doc('charlie').set({
            age: 21,
            name: 'Charlie',
          })
          const result = await db
            .collection('users')
            .where('age', '==', 21)
            .limit(1)
            .get()
          return result
        })
        assert(realResult.status === 'fulfilled')
        assert(emulatorResult.status === 'fulfilled')
        expect(emulatorResult.value.docs.map((doc) => doc.data())).toEqual(
          realResult.value.docs.map((doc) => doc.data()),
        )
      })
    })
  })
})

describe('onSnapshot for collection', () => {
  it('onSnapshot', async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db.collection('users').doc('alice').set({ name: 'Alice' })
      await db.collection('users').doc('bob').set({ name: 'Bob' })
      await db.collection('users').doc('charlie').set({ name: 'Charlie' })

      return new Promise((resolve) => {
        const unsubscribe = db.collection('users').onSnapshot((snapshot) => {
          resolve(snapshot.docs.map((v) => v.data()))
          unsubscribe()
        })
      })
    })
    assert(realResult.status === 'fulfilled')
    assert(emulatorResult.status === 'fulfilled')
    expect(emulatorResult.value).toEqual(realResult.value)
  })

  describe('snapshot.docChanges', () => {
    it('create', async () => {
      const [realResult, emulatorResult] = await testCase(
        async (db, compare) => {
          await db.collection('users').doc('alice').set({ name: 'Alice' })
          await db.collection('users').doc('bob').set({ name: 'Bob' })
          await db.collection('users').doc('charlie').set({ name: 'Charlie' })

          await new Promise((resolve) => {
            const later1 = resolveLater()
            let isCreate = false
            const unsubscribe = db
              .collection('users')
              .onSnapshot((snapshot) => {
                later1.resolve()
                compare(snapshot.docChanges().map((v) => v.doc.data()))

                if (isCreate) {
                  expect(
                    snapshot.docChanges().some((v) => v.type === 'added'),
                  ).toBe(true)
                  compare(
                    snapshot.docChanges().map((v) => ({
                      data: v.doc.data(),
                      newIndex: v.newIndex,
                      oldIndex: v.oldIndex,
                      type: v.type,
                    })),
                  )
                  unsubscribe()
                  resolve(null)
                }
              })

            void later1.promise.then(() => {
              void db.collection('users').doc('dennis').set({ name: 'Dennis' })
              isCreate = true
            })
          })
        },
      )
      assert(realResult.status === 'fulfilled')
      assert(emulatorResult.status === 'fulfilled')
    })

    it('update', async () => {
      const [realResult, emulatorResult] = await testCase(
        async (db, compare) => {
          await db.collection('users').doc('alice').set({ name: 'Alice' })
          await db.collection('users').doc('bob').set({ name: 'Bob' })
          await db.collection('users').doc('charlie').set({ name: 'Charlie' })

          await new Promise((resolve) => {
            const later1 = resolveLater()
            let isUpdated = false
            const unsubscribe = db
              .collection('users')
              .onSnapshot((snapshot) => {
                later1.resolve()
                compare(snapshot.docChanges().map((v) => v.doc.data()))

                if (isUpdated) {
                  expect(
                    snapshot.docChanges().some((v) => v.type === 'modified'),
                  ).toBe(true)
                  compare(
                    snapshot.docChanges().map((v) => ({
                      data: v.doc.data(),
                      newIndex: v.newIndex,
                      oldIndex: v.oldIndex,
                      type: v.type,
                    })),
                  )
                  unsubscribe()
                  resolve(null)
                }
              })

            void later1.promise.then(() => {
              void db.collection('users').doc('alice').update({ age: 20 })
              isUpdated = true
            })
          })
        },
      )
      assert(realResult.status === 'fulfilled')
      assert(emulatorResult.status === 'fulfilled')
    })

    it('delete', async () => {
      const [realResult, emulatorResult] = await testCase(
        async (db, compare) => {
          await db.collection('users').doc('alice').set({ name: 'Alice' })
          await db.collection('users').doc('bob').set({ name: 'Bob' })
          await db.collection('users').doc('charlie').set({ name: 'Charlie' })

          await new Promise((resolve) => {
            const later1 = resolveLater()
            let isDeleted = false
            const unsubscribe = db
              .collection('users')
              .onSnapshot((snapshot) => {
                later1.resolve()
                compare(snapshot.docChanges().map((v) => v.doc.data()))

                if (isDeleted) {
                  expect(
                    snapshot.docChanges().some((v) => v.type === 'removed'),
                  ).toBe(true)
                  compare(
                    snapshot.docChanges().map((v) => ({
                      data: v.doc.data(),
                      newIndex: v.newIndex,
                      oldIndex: v.oldIndex,
                      type: v.type,
                    })),
                  )
                  unsubscribe()
                  resolve(null)
                }
              })

            void later1.promise.then(() => {
              void db.collection('users').doc('alice').delete()
              isDeleted = true
            })
          })
        },
      )
      assert(realResult.status === 'fulfilled')
      assert(emulatorResult.status === 'fulfilled')
    })
  })
})

describe('onSnapshot for document', () => {
  it('onSnapshot', async () => {
    const [realResult, emulatorResult] = await testCase(async (db, compare) => {
      await db.collection('users').doc('alice').set({ name: 'Alice' })

      return new Promise((resolve) => {
        const unsubscribe = db
          .collection('users')
          .doc('alice')
          .onSnapshot((snapshot) => {
            compare(snapshot.data())
            resolve(null)
            unsubscribe()
          })
      })
    })
    assert(realResult.status === 'fulfilled')
    assert(emulatorResult.status === 'fulfilled')
  })

  it('create', async () => {
    const [realResult, emulatorResult] = await testCase(async (db, compare) => {
      await new Promise((resolve) => {
        const later1 = resolveLater()
        let isCreate = false
        const unsubscribe = db
          .collection('users')
          .doc('alice')
          .onSnapshot((snapshot) => {
            later1.resolve()
            compare(snapshot.data())

            if (isCreate) {
              expect(snapshot.exists).toBe(true)
              compare(snapshot.data())
              unsubscribe()
              resolve(null)
            }
          })

        void later1.promise.then(() => {
          void db.collection('users').doc('alice').set({ name: 'Alice' })
          isCreate = true
        })
      })
    })
    assert(realResult.status === 'fulfilled')
    assert(emulatorResult.status === 'fulfilled')
  })

  it('update', async () => {
    const [realResult, emulatorResult] = await testCase(async (db, compare) => {
      await db.collection('users').doc('alice').set({ name: 'Alice' })
      await new Promise((resolve) => {
        const later1 = resolveLater()
        let isUpdate = false
        const unsubscribe = db
          .collection('users')
          .doc('alice')
          .onSnapshot((snapshot) => {
            later1.resolve()
            compare(snapshot.data())

            if (isUpdate) {
              expect(snapshot.exists).toBe(true)
              compare(snapshot.data())
              unsubscribe()
              resolve(null)
            }
          })

        void later1.promise.then(() => {
          void db.collection('users').doc('alice').update({ age: 20 })
          isUpdate = true
        })
      })
    })
    assert(realResult.status === 'fulfilled')
    assert(emulatorResult.status === 'fulfilled')
  })

  it('delete', async () => {
    const [realResult, emulatorResult] = await testCase(async (db, compare) => {
      await db.collection('users').doc('alice').set({ name: 'Alice' })
      await new Promise((resolve) => {
        const later1 = resolveLater()
        let isDelete = false
        const unsubscribe = db
          .collection('users')
          .doc('alice')
          .onSnapshot((snapshot) => {
            later1.resolve()
            compare(snapshot.data())

            if (isDelete) {
              expect(snapshot.exists).toBe(false)
              unsubscribe()
              resolve(null)
            }
          })

        void later1.promise.then(() => {
          void db.collection('users').doc('alice').delete()
          isDelete = true
        })
      })
    })
    assert(realResult.status === 'fulfilled')
    assert(emulatorResult.status === 'fulfilled')
  })
})

const resolveLater = () => {
  let isResolved = false
  let resolve: () => void = () => undefined
  const promise = new Promise<null>((r) => {
    resolve = () => {
      if (isResolved) return
      isResolved = true
      r(null)
    }
  })
  return { getIsResolved: () => isResolved, promise, resolve }
}

describe('delete document with precondition', () => {
  describe('without precondition', () => {
    it('delete document which is not exist', async () => {
      const [realResult, emulatorResult] = await testCase(async (db) => {
        await db.collection('users').doc('alice').delete()
      })
      assert(realResult.status === 'fulfilled')
      assert(emulatorResult.status === 'fulfilled')
      expect(emulator.state.toJSON()).toMatchSnapshot()
    })

    it('delete document which is exist', async () => {
      const [realResult, emulatorResult] = await testCase(
        async (db, compare) => {
          await db.collection('users').doc('alice').set({ name: 'Alice' })
          await db.collection('users').doc('alice').delete()
          const snapshot = await db.collection('users').doc('alice').get()
          const doc = snapshot.data()
          compare(doc)
        },
      )
      assert(realResult.status === 'fulfilled')
      assert(emulatorResult.status === 'fulfilled')
      expect(emulator.state.toJSON()).toMatchSnapshot()
    })
  })

  describe('with precondition', () => {
    describe('must not be exist', () => {
      it('delete document which is not exist', async () => {
        const [realResult, emulatorResult] = await testCase(async (db) => {
          await db.collection('users').doc('alice').delete({ exists: false })
        })
        assert(realResult.status === 'fulfilled')
        assert(emulatorResult.status === 'fulfilled')
        expect(emulator.state.toJSON()).toMatchSnapshot()
      })

      it('delete document which is exist', async () => {
        const [realResult, emulatorResult] = await testCase(
          async (db, compare) => {
            await db.collection('users').doc('alice').set({ name: 'Alice' })
            await db.collection('users').doc('alice').delete({ exists: false })
            const snapshot = await db.collection('users').doc('alice').get()
            const doc = snapshot.data()
            compare(doc)
          },
        )
        assert(realResult.status === 'rejected')
        assert(emulatorResult.status === 'rejected')
        expect(emulatorResult.reason).toEqual(realResult.reason)
        expect(emulator.state.toJSON()).toMatchSnapshot()
      })
    })

    describe('must be exist', () => {
      it('delete document which is not exist', async () => {
        const [realResult, emulatorResult] = await testCase(async (db) => {
          await db.collection('users').doc('alice').delete({ exists: true })
        })
        assert(realResult.status === 'rejected')
        assert(emulatorResult.status === 'rejected')
        expect(emulatorResult.reason).toEqual(realResult.reason)
        expect(emulator.state.toJSON()).toMatchSnapshot()
      })

      it('delete document which is exist', async () => {
        const [realResult, emulatorResult] = await testCase(
          async (db, compare) => {
            await db.collection('users').doc('alice').set({ name: 'Alice' })
            await db.collection('users').doc('alice').delete({ exists: true })
            const snapshot = await db.collection('users').doc('alice').get()
            const doc = snapshot.data()
            compare(doc)
          },
        )
        assert(realResult.status === 'fulfilled')
        assert(emulatorResult.status === 'fulfilled')
        expect(emulator.state.toJSON()).toMatchSnapshot()
      })
    })
  })
})
