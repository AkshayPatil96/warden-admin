import argon2 from 'argon2'

// Argon2id is the default in this lib. Never store plaintext or fast/unsalted hashes.
export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id })
}

export function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return argon2.verify(hash, plain)
}
