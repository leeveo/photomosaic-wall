'use client'

export async function getDbClient() {
  if (typeof window === 'undefined') {
    throw new Error('db.client.ts ne peut être utilisé que côté client')
  }

  return import('./db.client')
}
