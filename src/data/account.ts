export const ACCOUNT_STORAGE_KEY = 'kidrhythm:account:v1'
export const SESSION_STORAGE_KEY = 'kidrhythm:session:v1'

export interface LocalAccount {
  householdName: string
  email: string
  passcodeHash: string
  createdAt: string
}

export interface AccountSession {
  email: string
  signedInAt: string
}

export interface AccountInput {
  householdName: string
  email: string
  passcode: string
}

export interface StorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export function loadAccount(storage: StorageLike | undefined): LocalAccount | null {
  if (!storage) {
    return null
  }

  try {
    const stored = storage.getItem(ACCOUNT_STORAGE_KEY)

    if (!stored) {
      return null
    }

    return normalizeAccount(JSON.parse(stored))
  } catch {
    return null
  }
}

export function saveAccount(
  storage: StorageLike | undefined,
  account: LocalAccount,
): void {
  storage?.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account))
}

export function clearAccount(storage: StorageLike | undefined): void {
  storage?.removeItem(ACCOUNT_STORAGE_KEY)
  clearSession(storage)
}

export function loadSession(
  storage: StorageLike | undefined,
  account: LocalAccount | null,
): AccountSession | null {
  if (!storage || !account) {
    return null
  }

  try {
    const stored = storage.getItem(SESSION_STORAGE_KEY)

    if (!stored) {
      return null
    }

    const session = normalizeSession(JSON.parse(stored))

    return session?.email === account.email ? session : null
  } catch {
    return null
  }
}

export function saveSession(
  storage: StorageLike | undefined,
  session: AccountSession,
): void {
  storage?.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function clearSession(storage: StorageLike | undefined): void {
  storage?.removeItem(SESSION_STORAGE_KEY)
}

export function createLocalAccount(
  input: AccountInput,
  now = new Date(),
): LocalAccount {
  const email = normalizeEmail(input.email)

  return {
    householdName: input.householdName.trim(),
    email,
    passcodeHash: hashPasscode(email, input.passcode),
    createdAt: now.toISOString(),
  }
}

export function createSession(
  account: LocalAccount,
  now = new Date(),
): AccountSession {
  return {
    email: account.email,
    signedInAt: now.toISOString(),
  }
}

export function verifyPasscode(
  account: LocalAccount,
  email: string,
  passcode: string,
): boolean {
  const normalizedEmail = normalizeEmail(email)

  return (
    normalizedEmail === account.email &&
    hashPasscode(normalizedEmail, passcode) === account.passcodeHash
  )
}

export function validateAccountInput(input: AccountInput): string | null {
  if (!input.householdName.trim()) {
    return 'Add a household name.'
  }

  if (!isValidEmail(input.email)) {
    return 'Use a valid email address.'
  }

  if (input.passcode.length < 6) {
    return 'Use at least 6 characters for the passcode.'
  }

  return null
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function normalizeAccount(value: unknown): LocalAccount | null {
  if (!isRecord(value)) {
    return null
  }

  const householdName =
    typeof value.householdName === 'string' ? value.householdName.trim() : ''
  const email = typeof value.email === 'string' ? normalizeEmail(value.email) : ''
  const passcodeHash =
    typeof value.passcodeHash === 'string' ? value.passcodeHash : ''
  const createdAt = typeof value.createdAt === 'string' ? value.createdAt : ''

  if (!householdName || !isValidEmail(email) || !passcodeHash || !createdAt) {
    return null
  }

  return {
    householdName,
    email,
    passcodeHash,
    createdAt,
  }
}

function normalizeSession(value: unknown): AccountSession | null {
  if (!isRecord(value)) {
    return null
  }

  const email = typeof value.email === 'string' ? normalizeEmail(value.email) : ''
  const signedInAt =
    typeof value.signedInAt === 'string' ? value.signedInAt : ''

  if (!isValidEmail(email) || !signedInAt) {
    return null
  }

  return {
    email,
    signedInAt,
  }
}

function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email)

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
}

function hashPasscode(email: string, passcode: string): string {
  const input = `${normalizeEmail(email)}:${passcode}:kidrhythm-local-account`
  let hash = 0x811c9dc5

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return (hash >>> 0).toString(16).padStart(8, '0')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
