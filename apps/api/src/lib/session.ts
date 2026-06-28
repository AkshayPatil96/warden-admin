import type { CookieOptions, Response } from 'express'
import { env } from '../config/env.js'
import { UserStatus } from '../generated/prisma/client.js'
import type { PrismaClient, Prisma } from '../generated/prisma/client.js'
import { prisma } from './prisma.js'
import { createSession as createSessionRecord, findSessionById, findUserForSession, revokeSession as revokeSessionRecord } from '../modules/auth/auth.repository.js'
import type { ResolvedSession, SessionRecord } from '../modules/auth/auth.types.js'

type DbClient = PrismaClient | Prisma.TransactionClient

export const SESSION_COOKIE = 'admin_session'

function sessionCookieOptions(expiresAt: Date): CookieOptions {
	return {
		httpOnly: true,
		secure: env.COOKIE_SECURE,
		sameSite: 'lax',
		path: '/',
		expires: expiresAt,
	}
}

export async function createSession(
	userId: string,
	rememberMe: boolean = false,
	client: DbClient = prisma
): Promise<SessionRecord> {
	const ttlHours = rememberMe ? env.REMEMBER_ME_SESSION_TTL_HOURS : env.SESSION_TTL_HOURS
	const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000)
	return createSessionRecord(userId, expiresAt, client)
}

export function setSessionCookie(res: Response, session: SessionRecord): void {
	res.cookie(SESSION_COOKIE, session.id, sessionCookieOptions(session.expiresAt))
}

export function clearSessionCookie(res: Response): void {
	res.clearCookie(SESSION_COOKIE, {
		httpOnly: true,
		secure: env.COOKIE_SECURE,
		sameSite: 'lax',
		path: '/',
	})
}

export async function resolveSession(
	sessionId: string,
	client: DbClient = prisma
): Promise<ResolvedSession | null> {
	const session = await findSessionById(sessionId, client)
	if (!session) {
		return null
	}

	if (session.expiresAt <= new Date()) {
		await revokeSessionRecord(sessionId, client)
		return null
	}

	const user = await findUserForSession(session.userId, client)
	if (!user || user.status !== UserStatus.ACTIVE) {
		await revokeSessionRecord(sessionId, client)
		return null
	}

	return {
		session,
		user: {
			id: user.id,
			email: user.email,
			name: user.name,
			permissions: user.permissions,
		},
	}
}

export async function revokeSession(sessionId: string, client: DbClient = prisma): Promise<boolean> {
	return revokeSessionRecord(sessionId, client)
}
