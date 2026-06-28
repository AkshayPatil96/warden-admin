import { Prisma, UserStatus } from '../../generated/prisma/client.js'
import type { PrismaClient } from '../../generated/prisma/client.js'
import { prisma } from '../../lib/prisma.js'
import type { LoginUserRecord, SessionRecord, AuthenticatedUser, PasswordResetRecord } from './auth.types.js'

type DbClient = PrismaClient | Prisma.TransactionClient

interface PermissionRelation {
	permission: {
		key: string
	}
}

interface RoleRelation {
	role: {
		permissions: PermissionRelation[]
	}
}

const rolePermissionInclude = {
	roles: {
		include: {
			role: {
				include: {
					permissions: {
						include: {
							permission: true,
						},
					},
				},
			},
		},
	},
} as const

function extractPermissions(roles: RoleRelation[]): string[] {
	return [...new Set(roles.flatMap((item) => item.role.permissions.map((permission) => permission.permission.key)))]
}

export async function findUserForLogin(email: string, client: DbClient = prisma): Promise<LoginUserRecord | null> {
	const user = await client.user.findUnique({
		where: { email },
		include: rolePermissionInclude,
	})

	if (!user) {
		return null
	}

	return {
		id: user.id,
		email: user.email,
		name: user.name,
		passwordHash: user.passwordHash,
		status: user.status,
		failedLoginCount: user.failedLoginCount,
		lockedUntil: user.lockedUntil,
		permissions: extractPermissions(user.roles),
	}
}

// Increments the failed-login counter; once it reaches maxFailed, locks the account
// for lockMinutes and resets the counter. Returns true when this call triggered a lock.
// ponytail: two small updates, fine at this scale; revisit if login throughput ever matters.
export async function recordFailedLogin(
	userId: string,
	maxFailed: number,
	lockMinutes: number,
	client: DbClient = prisma
): Promise<boolean> {
	const updated = await client.user.update({
		where: { id: userId },
		data: { failedLoginCount: { increment: 1 } },
		select: { failedLoginCount: true },
	})

	if (updated.failedLoginCount < maxFailed) {
		return false
	}

	await client.user.update({
		where: { id: userId },
		data: {
			failedLoginCount: 0,
			lockedUntil: new Date(Date.now() + lockMinutes * 60 * 1000),
		},
	})
	return true
}

export async function resetLoginFailures(userId: string, client: DbClient = prisma): Promise<void> {
	await client.user.update({
		where: { id: userId },
		data: { failedLoginCount: 0, lockedUntil: null },
	})
}

export async function updatePasswordHash(userId: string, passwordHash: string, client: DbClient = prisma): Promise<void> {
	await client.user.update({
		where: { id: userId },
		data: { passwordHash },
	})
}

export async function revokeAllSessionsForUser(userId: string, client: DbClient = prisma): Promise<number> {
	const result = await client.session.deleteMany({ where: { userId } })
	return result.count
}

export async function createPasswordReset(
	userId: string,
	tokenHash: string,
	expiresAt: Date,
	client: DbClient = prisma
): Promise<void> {
	await client.passwordReset.create({
		data: { userId, tokenHash, expiresAt },
	})
}

export async function findValidPasswordReset(
	tokenHash: string,
	client: DbClient = prisma
): Promise<PasswordResetRecord | null> {
	return client.passwordReset.findFirst({
		where: {
			tokenHash,
			usedAt: null,
			expiresAt: { gt: new Date() },
		},
		select: { id: true, userId: true, expiresAt: true, usedAt: true },
	})
}

// Marks the reset used only if it is still unused — guards against a double-submit race.
// Returns true when this call was the one that consumed the token.
export async function consumePasswordReset(id: string, client: DbClient = prisma): Promise<boolean> {
	const result = await client.passwordReset.updateMany({
		where: { id, usedAt: null },
		data: { usedAt: new Date() },
	})
	return result.count > 0
}

export async function findUserForSession(
	userId: string,
	client: DbClient = prisma
): Promise<AuthenticatedUser & { status: UserStatus } | null> {
	const user = await client.user.findUnique({
		where: { id: userId },
		include: {
			roles: {
				include: {
					role: {
						include: {
							permissions: {
								include: {
									permission: true,
								},
							},
						},
					},
				},
			},
		},
	})

	if (!user) {
		return null
	}

	return {
		id: user.id,
		email: user.email,
		name: user.name,
		status: user.status,
		permissions: extractPermissions(user.roles),
	}
}

export async function findSessionById(sessionId: string, client: DbClient = prisma): Promise<SessionRecord | null> {
	const session = await client.session.findUnique({
		where: { id: sessionId },
		select: {
			id: true,
			userId: true,
			expiresAt: true,
			createdAt: true,
		},
	})

	return session
}

export async function createSession(
	userId: string,
	expiresAt: Date,
	client: DbClient = prisma
): Promise<SessionRecord> {
	return client.session.create({
		data: {
			userId,
			expiresAt,
		},
		select: {
			id: true,
			userId: true,
			expiresAt: true,
			createdAt: true,
		},
	})
}

export async function revokeSession(sessionId: string, client: DbClient = prisma): Promise<boolean> {
	const result = await client.session.deleteMany({
		where: { id: sessionId },
	})

	return result.count > 0
}
