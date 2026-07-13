import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../setup';
import { PrismaSessionRepository } from '../../../src/modules/identity/infrastructure/repositories/PrismaSessionRepository';
import { PrismaUserRepository } from '../../../src/modules/identity/infrastructure/repositories/PrismaUserRepository';
import { SessionEntity } from '../../../src/modules/identity/domain/entities/Session.entity';
import { UserEntity } from '../../../src/modules/identity/domain/entities/User.entity';

describe('PrismaSessionRepository Integration Tests', () => {
  let sessionRepository: PrismaSessionRepository;
  let userRepository: PrismaUserRepository;
  let testUserId: string;

  beforeEach(async () => {
    sessionRepository = new PrismaSessionRepository(prisma);
    userRepository = new PrismaUserRepository(prisma);

    // We need a real user in the DB to satisfy foreign key constraints
    const user = UserEntity.create({
      email: 'session.test@example.com',
      normalizedEmail: 'SESSION.TEST@EXAMPLE.COM',
      passwordHash: 'hash',
      firstName: 'Session',
      lastName: 'Tester',
      isActive: true,
      isEmailVerified: true,
    });
    
    const createdUser = await userRepository.create(user);
    testUserId = createdUser.id;
  });

  it('should create and persist a new session', async () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    const session = SessionEntity.create({
      userId: testUserId,
      expiresAt,
      browser: 'Chrome',
      platform: 'Windows',
    });

    const createdSession = await sessionRepository.create(session);

    expect(createdSession.id).toBe(session.id);
    expect(createdSession.userId).toBe(testUserId);
    expect(createdSession.browser).toBe('Chrome');
    expect(createdSession.platform).toBe('Windows');
    
    const dbSession = await prisma.session.findUnique({ where: { id: session.id } });
    expect(dbSession).toBeDefined();
    expect(dbSession?.browser).toBe('Chrome');
  });

  it('should find a session by ID', async () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const session = SessionEntity.create({
      userId: testUserId,
      expiresAt,
      deviceName: 'My Device',
    });

    await sessionRepository.create(session);

    const foundSession = await sessionRepository.findById(session.id);

    expect(foundSession).toBeDefined();
    expect(foundSession?.id).toBe(session.id);
    expect(foundSession?.deviceName).toBe('My Device');
  });

  it('should find active sessions by user ID', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    // Active session
    const session1 = SessionEntity.create({
      userId: testUserId,
      expiresAt: futureDate,
      deviceName: 'Active Session',
    });

    // Expired session
    const session2 = SessionEntity.create({
      userId: testUserId,
      expiresAt: pastDate,
      deviceName: 'Expired Session',
    });

    // Revoked session
    const session3 = SessionEntity.create({
      userId: testUserId,
      expiresAt: futureDate,
      deviceName: 'Revoked Session',
    });

    await sessionRepository.create(session1);
    await sessionRepository.create(session2);
    const createdSession3 = await sessionRepository.create(session3);
    
    // Revoke session3 in the database to test the active check
    await sessionRepository.revoke(createdSession3.id, 'TEST_REVOKE');

    const activeSessions = await sessionRepository.findActiveByUserId(testUserId);

    // Only session1 should be returned
    expect(activeSessions.length).toBe(1);
    expect(activeSessions[0].id).toBe(session1.id);
    expect(activeSessions[0].deviceName).toBe('Active Session');
  });

  it('should revoke a session', async () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const session = SessionEntity.create({
      userId: testUserId,
      expiresAt,
    });

    await sessionRepository.create(session);

    await sessionRepository.revoke(session.id, 'SECURITY_COMPROMISE');

    const revokedSession = await sessionRepository.findById(session.id);
    
    expect(revokedSession?.isRevoked()).toBe(true);
    expect(revokedSession?.revokedReason).toBe('SECURITY_COMPROMISE');
    expect(revokedSession?.revokedAt).toBeInstanceOf(Date);
  });

  it('should revoke all sessions for a user', async () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const session1 = SessionEntity.create({ userId: testUserId, expiresAt });
    const session2 = SessionEntity.create({ userId: testUserId, expiresAt });

    await sessionRepository.create(session1);
    await sessionRepository.create(session2);

    await sessionRepository.revokeAllForUser(testUserId, 'USER_LOGOUT');

    const s1 = await sessionRepository.findById(session1.id);
    const s2 = await sessionRepository.findById(session2.id);

    expect(s1?.isRevoked()).toBe(true);
    expect(s2?.isRevoked()).toBe(true);
    expect(s1?.revokedReason).toBe('USER_LOGOUT');
    expect(s2?.revokedReason).toBe('USER_LOGOUT');
  });
});
