import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let moduleRef: TestingModule;
  let service: UsersService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          dropSchema: true,
          entities: [User],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([User]),
      ],
      providers: [UsersService],
    }).compile();

    await moduleRef.init();
    service = moduleRef.get(UsersService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('persists a user and returns it', async () => {
    const created = await service.create({ email: 'a@b.com', passwordHash: 'hash' });

    expect(created.id).toBeDefined();
    expect(created.email).toBe('a@b.com');
    expect(created.passwordHash).toBe('hash');
  });

  it('findByEmail returns the matching user', async () => {
    const created = await service.create({ email: 'a@b.com', passwordHash: 'hash' });

    const found = await service.findByEmail('a@b.com');

    expect(found?.id).toBe(created.id);
  });

  it('findByEmail returns null when no user matches', async () => {
    expect(await service.findByEmail('missing@b.com')).toBeNull();
  });

  it('findById returns the matching user', async () => {
    const created = await service.create({ email: 'a@b.com', passwordHash: 'hash' });

    const found = await service.findById(created.id);

    expect(found?.email).toBe('a@b.com');
  });

  it('findById returns null for an unknown id', async () => {
    expect(await service.findById('00000000-0000-0000-0000-000000000000')).toBeNull();
  });

  it('rejects a duplicate email', async () => {
    await service.create({ email: 'a@b.com', passwordHash: 'hash-1' });

    await expect(service.create({ email: 'a@b.com', passwordHash: 'hash-2' })).rejects.toThrow();
  });
});
