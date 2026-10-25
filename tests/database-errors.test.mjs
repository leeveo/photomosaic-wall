import test from 'node:test'
import assert from 'node:assert/strict'
import { databaseErrorMessage } from '../lib/database-errors.ts'

test('permission, schema, credentials and network errors have distinct guidance', () => {
  assert.match(databaseErrorMessage({code:'42501'}), /Accès refusé/)
  assert.match(databaseErrorMessage({code:'PGRST205'}), /schéma/)
  assert.match(databaseErrorMessage({code:'PGRST301'}), /clé/)
  assert.match(databaseErrorMessage({message:'Failed to fetch'}), /inaccessible/)
})
test('database details are not leaked into the UI', () => {
  assert.ok(!databaseErrorMessage({message:'private record data'}).includes('private record data'))
})
