import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fixture } from './helpers.ts'

test('retirar el reenvío también protege las solicitudes históricas pendientes', async () => {
  const f = fixture()
  await f.create()
  f.db.db.prepare("UPDATE trip_requests SET email = ?, email_status = 'pending' WHERE id = ?").run('legacy@example.test', f.id)
  assert.equal((await f.retry()).status, 404)
  assert.equal((await (await f.status()).json()).profile, 'explorador')
  assert.equal(f.sent.length, 0)
  assert.equal(f.db.db.prepare('SELECT email_attempts FROM trip_requests').get()?.email_attempts, 0)
})
