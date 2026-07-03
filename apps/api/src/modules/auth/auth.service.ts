import { createHash, randomBytes } from 'node:crypto'
import { UserStatus, type Prisma } from '../../generated/prisma/client.js'
import { RateLimitedAppError, UnauthorizedAppError, ValidationAppError } from '../../core/errors/app-error.js'
import { env } from '../../config/env.js'
import { logger } from '../../lib/logger.js'
import { prisma } from '../../lib/prisma.js'
import { hashPassword, verifyPassword } from '../../lib/password.js'
import { writeAudit } from '../../lib/audit.js'
import { createSession, resolveSession, revokeSession } from '../../lib/session.js'
import {
	consumePasswordReset,
	createPasswordReset,
	deleteSessionForUser,
	findPasswordHashById,
	findUserForLogin,
	findUserForSession,
	findValidPasswordReset,
	listSessionsForUser,
	recordFailedLogin,
	resetLoginFailures,
	revokeAllSessionsForUser,
	revokeOtherSessionsForUser,
	updateName,
	updatePasswordHash,
} from './auth.repository.js'
import type { AuthenticatedUser, LoginResult } from './auth.types.js'
import type { SessionSummary } from '@admin/shared'
import { NotFoundAppError } from '../../core/errors/app-error.js'

function hashToken(rawToken: string): string {
	// Reset tokens are 256-bit random values, so a fast hash is sufficient here —
	// we only need to avoid storing the raw token, not resist offline guessing.
	return createHash('sha256').update(rawToken).digest('hex')
}

// A real Argon2id hash of a throwaway value (not a secret). When an email has no account we
// still verify against this so the response time matches the real path — otherwise the timing
// gap (skipping Argon2) lets an attacker enumerate which emails exist.
let dummyHashPromise: Promise<string> | null = null
function dummyPasswordHash(): Promise<string> {
	dummyHashPromise ??= hashPassword('timing-equalizer.not-a-real-credential')
	return dummyHashPromise
}

export async function login(
	email: string,
	password: string,
	rememberMe: boolean = false
): Promise<LoginResult> {
	const user = await findUserForLogin(email)
	if (!user || user.status !== UserStatus.ACTIVE) {
		// Equalize timing with the real-user path (see dummyPasswordHash) before rejecting.
		await verifyPassword(await dummyPasswordHash(), password)
		throw new UnauthorizedAppError('Invalid email or password.')
	}

	// ponytail: showing a distinct "locked" message is friendlier but reveals the email exists
	// (a non-existent email never locks). Accepted tradeoff for an admin tool; swap to the generic
	// "Invalid email or password." here if account enumeration becomes a concern.
	if (user.lockedUntil && user.lockedUntil > new Date()) {
		throw new RateLimitedAppError('Account temporarily locked due to too many failed attempts. Try again later.')
	}

	const passwordMatches = await verifyPassword(user.passwordHash, password)
	if (!passwordMatches) {
		const locked = await recordFailedLogin(user.id, env.MAX_FAILED_LOGINS, env.ACCOUNT_LOCK_MINUTES)
		if (locked) {
			await writeAudit({
				actorId: user.id,
				action: 'auth.lockout',
				entity: 'user',
				entityId: user.id,
				after: { email: user.email, lockMinutes: env.ACCOUNT_LOCK_MINUTES },
			})
		}
		throw new UnauthorizedAppError('Invalid email or password.')
	}

	return prisma.$transaction(async (client: Prisma.TransactionClient) => {
		await resetLoginFailures(user.id, client)
		const session = await createSession(user.id, rememberMe, client)

		await writeAudit(
			{
				actorId: user.id,
				action: 'auth.login',
				entity: 'session',
				entityId: session.id,
				after: {
					userId: user.id,
					email: user.email,
					expiresAt: session.expiresAt.toISOString(),
				},
			},
			client
		)

		return {
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				permissions: user.permissions,
			},
			session,
		}
	})
}

// Always resolves the same way to the caller (the controller returns 204 regardless) so the
// endpoint can't be used to discover which emails have accounts.
export async function requestPasswordReset(email: string): Promise<void> {
	const user = await findUserForLogin(email)
	if (!user || user.status !== UserStatus.ACTIVE) {
		return
	}

	const rawToken = randomBytes(32).toString('hex')
	const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60 * 1000)
	await createPasswordReset(user.id, hashToken(rawToken), expiresAt)
	await writeAudit({
		actorId: user.id,
		action: 'auth.password_reset_requested',
		entity: 'user',
		entityId: user.id,
	})

	// ponytail: no mailer wired. Replace the dev branch with a real email send (the raw token
	// must only ever be delivered to the user, never persisted). Logging the token outside dev
	// would hand account takeover to anyone with log access, so production logs nothing sensitive.
	if (env.NODE_ENV === 'production') {
		logger.info({ userId: user.id }, 'Password reset requested')
	} else {
		const resetLink = `${env.WEB_ORIGIN}/reset-password?token=${rawToken}`
		logger.info({ email: user.email, resetLink }, 'Password reset requested (dev)')
	}
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
	const record = await findValidPasswordReset(hashToken(token))
	if (!record) {
		throw new ValidationAppError('Invalid or expired reset token.')
	}

	// Hash outside the transaction — argon2 is intentionally slow and would hold the txn open.
	const passwordHash = await hashPassword(newPassword)

	await prisma.$transaction(async (client: Prisma.TransactionClient) => {
		const consumed = await consumePasswordReset(record.id, client)
		if (!consumed) {
			throw new ValidationAppError('Invalid or expired reset token.')
		}

		await updatePasswordHash(record.userId, passwordHash, client)
		await resetLoginFailures(record.userId, client)
		await revokeAllSessionsForUser(record.userId, client)
		await writeAudit(
			{
				actorId: record.userId,
				action: 'auth.password_reset',
				entity: 'user',
				entityId: record.userId,
			},
			client
		)
	})
}

export async function logout(sessionId: string, actor: AuthenticatedUser): Promise<void> {
	await prisma.$transaction(async (client: Prisma.TransactionClient) => {
		const session = await resolveSession(sessionId, client)
		if (!session) {
			return
		}

		await revokeSession(sessionId, client)
		await writeAudit(
			{
				actorId: actor.id,
				action: 'auth.logout',
				entity: 'session',
				entityId: sessionId,
				before: {
					userId: session.user.id,
					email: session.user.email,
					expiresAt: session.session.expiresAt.toISOString(),
				},
			},
			client
		)
	})
}

export async function currentUser(sessionId: string): Promise<AuthenticatedUser> {
	const session = await resolveSession(sessionId)
	if (!session) {
		throw new UnauthorizedAppError()
	}

	return session.user
}

// Self-service: update the caller's own display name. Returns the refreshed
// AuthenticatedUser (permissions unchanged) so the client can update its cache.
export async function updateProfile(actor: AuthenticatedUser, name: string): Promise<AuthenticatedUser> {
	await prisma.$transaction(async (client: Prisma.TransactionClient) => {
		await updateName(actor.id, name, client)
		await writeAudit(
			{
				actorId: actor.id,
				action: 'user.update',
				entity: 'user',
				entityId: actor.id,
				before: { name: actor.name },
				after: { name },
			},
			client
		)
	})

	const refreshed = await findUserForSession(actor.id)
	if (!refreshed) {
		throw new UnauthorizedAppError()
	}
	return { id: refreshed.id, email: refreshed.email, name: refreshed.name, permissions: refreshed.permissions }
}

// Self-service password change. Verifies the current password, then updates the
// hash and signs out every OTHER session (this one stays valid).
export async function changePassword(
	actor: AuthenticatedUser,
	currentSessionId: string,
	currentPassword: string,
	newPassword: string
): Promise<void> {
	const currentHash = await findPasswordHashById(actor.id)
	if (!currentHash) {
		throw new UnauthorizedAppError()
	}

	const matches = await verifyPassword(currentHash, currentPassword)
	if (!matches) {
		throw new ValidationAppError('Current password is incorrect.')
	}
	if (await verifyPassword(currentHash, newPassword)) {
		throw new ValidationAppError('New password must be different from the current one.')
	}

	// Hash outside the transaction — argon2 is intentionally slow.
	const passwordHash = await hashPassword(newPassword)

	await prisma.$transaction(async (client: Prisma.TransactionClient) => {
		await updatePasswordHash(actor.id, passwordHash, client)
		await resetLoginFailures(actor.id, client)
		await revokeOtherSessionsForUser(actor.id, currentSessionId, client)
		await writeAudit(
			{
				actorId: actor.id,
				action: 'auth.password_change',
				entity: 'user',
				entityId: actor.id,
			},
			client
		)
	})
}

export async function listSessions(actor: AuthenticatedUser, currentSessionId: string): Promise<SessionSummary[]> {
	const sessions = await listSessionsForUser(actor.id)
	return sessions.map((s) => ({
		id: s.id,
		createdAt: s.createdAt.toISOString(),
		expiresAt: s.expiresAt.toISOString(),
		current: s.id === currentSessionId,
	}))
}

export async function revokeSessionById(
	actor: AuthenticatedUser,
	currentSessionId: string,
	targetSessionId: string
): Promise<void> {
	if (targetSessionId === currentSessionId) {
		throw new ValidationAppError('Use sign out to end your current session.')
	}
	const revoked = await deleteSessionForUser(actor.id, targetSessionId)
	if (!revoked) {
		throw new NotFoundAppError('Session not found.')
	}
	await writeAudit({
		actorId: actor.id,
		action: 'auth.session_revoked',
		entity: 'session',
		entityId: targetSessionId,
	})
}

export async function revokeOtherSessions(actor: AuthenticatedUser, currentSessionId: string): Promise<number> {
	const count = await revokeOtherSessionsForUser(actor.id, currentSessionId)
	if (count > 0) {
		await writeAudit({
			actorId: actor.id,
			action: 'auth.sessions_revoked_others',
			entity: 'session',
			entityId: currentSessionId,
			after: { revokedCount: count },
		})
	}
	return count
}
