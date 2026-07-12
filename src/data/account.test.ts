import { describe, expect, it } from 'vitest'
import {
  ACCOUNT_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  clearAccount,
  clearSession,
  createLocalAccount,
  createSession,
  loadAccount,
  loadSession,
  normalizeEmail,
  saveAccount,
  saveSession,
  validateAccountInput,
  verifyPasscode,
  type StorageLike,
} from './account'

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

class ThrowingStorage implements StorageLike {
  getItem(): string | null {
    throw new Error('storage unavailable')
  }

  setItem(): void {
    throw new Error('storage unavailable')
  }

  removeItem(): void {
    throw new Error('storage unavailable')
  }
}

describe('local account persistence', () => {
  it('creates, verifies, saves, and restores a local household account', () => {
    const storage = new MemoryStorage()
    const now = new Date('2026-07-04T12:00:00.000Z')
    const account = createLocalAccount(
      {
        householdName: '  Park House  ',
        email: ' Parent@Example.COM ',
        passcode: 'family1',
      },
      now,
    )
    const session = createSession(account, now)

    expect(account).toMatchObject({
      householdName: 'Park House',
      email: 'parent@example.com',
      createdAt: now.toISOString(),
    })
    expect(account.passcodeHash).not.toContain('family1')
    expect(session).toEqual({
      email: 'parent@example.com',
      signedInAt: now.toISOString(),
    })
    expect(verifyPasscode(account, ' parent@example.com ', 'family1')).toBe(true)
    expect(verifyPasscode(account, 'other@example.com', 'family1')).toBe(false)
    expect(verifyPasscode(account, 'parent@example.com', 'wrong-pass')).toBe(
      false,
    )

    saveAccount(storage, account)
    saveSession(storage, session)

    expect(loadAccount(storage)).toEqual(account)
    expect(loadSession(storage, account)).toEqual(session)
    expect(normalizeEmail(' Parent@Example.COM ')).toBe('parent@example.com')
  })

  it('validates account creation inputs before saving', () => {
    expect(
      validateAccountInput({
        householdName: ' ',
        email: 'parent@example.com',
        passcode: 'family1',
      }),
    ).toBe('Add a household name.')
    expect(
      validateAccountInput({
        householdName: 'Home',
        email: 'not-email',
        passcode: 'family1',
      }),
    ).toBe('Use a valid email address.')
    expect(
      validateAccountInput({
        householdName: 'Home',
        email: 'parent@example.com',
        passcode: 'short',
      }),
    ).toBe('Use at least 6 characters for the passcode.')
    expect(
      validateAccountInput({
        householdName: 'Home',
        email: 'parent@example.com',
        passcode: 'family1',
      }),
    ).toBeNull()
  })

  it('clears account and session state together', () => {
    const storage = new MemoryStorage()
    const account = createLocalAccount({
      householdName: 'Home',
      email: 'parent@example.com',
      passcode: 'family1',
    })
    const session = createSession(account)

    saveAccount(storage, account)
    saveSession(storage, session)
    clearAccount(storage)

    expect(storage.getItem(ACCOUNT_STORAGE_KEY)).toBeNull()
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull()
    expect(loadAccount(storage)).toBeNull()
    expect(loadSession(storage, account)).toBeNull()
  })

  it('treats missing storage as signed out and keeps no-op writes safe', () => {
    const account = createLocalAccount({
      householdName: 'Home',
      email: 'parent@example.com',
      passcode: 'family1',
    })
    const session = createSession(account)
    const storage = new MemoryStorage()

    expect(loadAccount(undefined)).toBeNull()
    expect(loadSession(undefined, account)).toBeNull()
    expect(loadSession(storage, null)).toBeNull()
    expect(loadSession(undefined, null)).toBeNull()
    expect(() => saveAccount(undefined, account)).not.toThrow()
    expect(() => saveSession(undefined, session)).not.toThrow()
    expect(() => clearSession(undefined)).not.toThrow()
    expect(() => clearAccount(undefined)).not.toThrow()
  })

  it('ignores malformed stored account records', () => {
    const storage = new MemoryStorage()

    expect(loadAccount(storage)).toBeNull()

    storage.setItem(ACCOUNT_STORAGE_KEY, 'not-json')
    expect(loadAccount(storage)).toBeNull()

    storage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(null))
    expect(loadAccount(storage)).toBeNull()

    storage.setItem(
      ACCOUNT_STORAGE_KEY,
      JSON.stringify({
        householdName: 42,
        email: false,
        passcodeHash: 99,
        createdAt: null,
      }),
    )
    expect(loadAccount(storage)).toBeNull()

    storage.setItem(
      ACCOUNT_STORAGE_KEY,
      JSON.stringify({
        householdName: 'Home',
        email: 'not-email',
        passcodeHash: 'hash',
        createdAt: '2026-07-04T12:00:00.000Z',
      }),
    )
    expect(loadAccount(storage)).toBeNull()

    expect(loadAccount(new ThrowingStorage())).toBeNull()
  })

  it('ignores malformed, mismatched, and unavailable stored sessions', () => {
    const storage = new MemoryStorage()
    const account = createLocalAccount({
      householdName: 'Home',
      email: 'parent@example.com',
      passcode: 'family1',
    })

    expect(loadSession(storage, account)).toBeNull()

    storage.setItem(SESSION_STORAGE_KEY, 'not-json')
    expect(loadSession(storage, account)).toBeNull()

    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(null))
    expect(loadSession(storage, account)).toBeNull()

    storage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        email: 42,
        signedInAt: false,
      }),
    )
    expect(loadSession(storage, account)).toBeNull()

    storage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        email: 'other@example.com',
        signedInAt: '2026-07-04T12:00:00.000Z',
      }),
    )
    expect(loadSession(storage, account)).toBeNull()

    storage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        email: 'parent@example.com',
        signedInAt: '',
      }),
    )
    expect(loadSession(storage, account)).toBeNull()
    expect(loadSession(new ThrowingStorage(), account)).toBeNull()
  })
})
