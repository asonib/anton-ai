import bcrypt from 'bcrypt';
import { env } from '../config/env';
import { randomUUID } from 'node:crypto';
import { ConflictException, ResourceNotFoundException, UnauthorizedException } from '../exceptions';
import { toUserDTO } from '../models/mappers';
import type { UserRepository } from '../models/repositories/user.repository';
import type { AuthResultDTO, AuthUser, UserDTO } from '../models/types';
import type { TokenService } from './token.service';

export class AuthService {
  /** Compared against when the e-mail is unknown so response timing does not reveal account existence. */
  private readonly dummyHash: string;

  constructor(
    private readonly users: UserRepository,
    private readonly tokens: TokenService,
    private readonly saltRounds: number = env.BCRYPT_SALT_ROUNDS,
  ) {
    this.dummyHash = bcrypt.hashSync(randomUUID(), this.saltRounds);
  }

  async register(email: string, password: string): Promise<AuthResultDTO> {
    const normalised = email.trim().toLowerCase();
    if (await this.users.findByEmail(normalised)) {
      throw new ConflictException('An account with this e-mail already exists');
    }
    const passwordHash = await bcrypt.hash(password, this.saltRounds);
    const user = await this.users.create({ email: normalised, passwordHash });
    return this.buildAuthResult(toUserDTO(user));
  }

  async login(email: string, password: string): Promise<AuthResultDTO> {
    const user = await this.users.findByEmail(email.trim().toLowerCase());
    const valid = await bcrypt.compare(password, user?.passwordHash ?? this.dummyHash);
    if (!user || !valid) {
      throw new UnauthorizedException('Invalid e-mail or password', 'INVALID_CREDENTIALS');
    }
    return this.buildAuthResult(toUserDTO(user));
  }

  /**
   * Verifies a bearer token AND that its subject still exists. A valid signature alone is not
   * enough: after a DB reset an old token would otherwise reach the services and fail with a
   * foreign-key error. Returning 401 makes the frontend clear the session and show the login page.
   */
  async authenticate(token: string): Promise<AuthUser> {
    const claims = this.tokens.verify(token);
    const user = await this.users.findById(claims.id);
    if (!user) throw new UnauthorizedException('Your session is no longer valid — please sign in again', 'ACCOUNT_NOT_FOUND');
    return { id: user.id, email: user.email };
  }

  async getProfile(userId: string): Promise<UserDTO> {
    const user = await this.users.findById(userId);
    if (!user) throw new ResourceNotFoundException('User');
    return toUserDTO(user);
  }

  private buildAuthResult(user: UserDTO): AuthResultDTO {
    return {
      token: this.tokens.sign({ id: user.id, email: user.email }),
      tokenType: 'Bearer',
      expiresIn: this.tokens.ttl,
      user,
    };
  }
}
