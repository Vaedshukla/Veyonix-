import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../setup';
import { PrismaUserRepository } from '../../../src/modules/identity/infrastructure/repositories/PrismaUserRepository';
import { UserEntity } from '../../../src/modules/identity/domain/entities/User.entity';

describe('PrismaUserRepository Integration Tests', () => {
  let repository: PrismaUserRepository;

  beforeEach(() => {
    repository = new PrismaUserRepository(prisma);
  });

  it('should create and persist a new user', async () => {
    const user = UserEntity.create({
      email: 'test@example.com',
      normalizedEmail: 'TEST@EXAMPLE.COM',
      passwordHash: 'hashed_password',
      firstName: 'John',
      lastName: 'Doe',
      isActive: true,
      isEmailVerified: false,
    });

    const createdUser = await repository.create(user);

    expect(createdUser.id).toBe(user.id);
    expect(createdUser.email).toBe('test@example.com');
    expect(createdUser.createdAt).toBeInstanceOf(Date);
    
    // Verify it's actually in DB
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser).toBeDefined();
    expect(dbUser?.email).toBe('test@example.com');
  });

  it('should find a user by ID', async () => {
    const user = UserEntity.create({
      email: 'findme@example.com',
      normalizedEmail: 'FINDME@EXAMPLE.COM',
      passwordHash: 'hash',
      firstName: 'Alice',
      lastName: 'Smith',
      isActive: true,
      isEmailVerified: true,
    });

    await repository.create(user);

    const foundUser = await repository.findById(user.id);

    expect(foundUser).toBeDefined();
    expect(foundUser?.id).toBe(user.id);
    expect(foundUser?.email).toBe('findme@example.com');
  });

  it('should find a user by normalized email', async () => {
    const user = UserEntity.create({
      email: 'Normalized@Example.com',
      normalizedEmail: 'NORMALIZED@EXAMPLE.COM',
      passwordHash: 'hash',
      firstName: 'Bob',
      lastName: 'Jones',
      isActive: true,
      isEmailVerified: true,
    });

    await repository.create(user);

    const foundUser = await repository.findByNormalizedEmail('NORMALIZED@EXAMPLE.COM');

    expect(foundUser).toBeDefined();
    expect(foundUser?.id).toBe(user.id);
  });

  it('should update an existing user', async () => {
    const user = UserEntity.create({
      email: 'update@example.com',
      normalizedEmail: 'UPDATE@EXAMPLE.COM',
      passwordHash: 'hash',
      firstName: 'Charlie',
      lastName: 'Brown',
      isActive: true,
      isEmailVerified: false,
    });

    const created = await repository.create(user);
    
    // Perform update operations on entity
    created.verifyEmail();
    created.changePassword('new_hash');

    const updated = await repository.update(created);

    expect(updated.isEmailVerified).toBe(true);
    expect(updated.passwordHash).toBe('new_hash');
    
    // Verify in DB
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser?.isEmailVerified).toBe(true);
    expect(dbUser?.passwordHash).toBe('new_hash');
    expect(dbUser?.version).toBe(created.version);
  });

  it('should soft delete a user', async () => {
    const user = UserEntity.create({
      email: 'delete@example.com',
      normalizedEmail: 'DELETE@EXAMPLE.COM',
      passwordHash: 'hash',
      firstName: 'Dave',
      lastName: 'Miller',
      isActive: true,
      isEmailVerified: true,
    });

    await repository.create(user);
    
    await repository.softDelete(user.id);

    // findById should return null since deletedAt is not null
    const foundUser = await repository.findById(user.id);
    expect(foundUser).toBeNull();
    
    // Verify it's actually just soft deleted in DB
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser).toBeDefined();
    expect(dbUser?.deletedAt).toBeInstanceOf(Date);
    expect(dbUser?.isActive).toBe(false);
  });
});
