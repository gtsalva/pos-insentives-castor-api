import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponse } from './interfaces/auth-response.interface';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmailWithHash(dto.email);
    if (!user || !user.is_active) throw new UnauthorizedException('Credenciales inválidas');

    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    const payload: JwtPayload = { sub: user.user_id, email: user.email, role: user.role, name: user.full_name, photo_url: user.photo_url ?? null };
    const response: AuthResponse = {
      access_token: this.jwtService.sign(payload),
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        photo_url: user.photo_url ?? null,
      },
    };

    this.auditService.log({
      action: 'LOGIN',
      entity_type: 'User',
      entity_id: user.user_id,
      actor: { id: user.user_id, name: user.full_name },
      metadata: { email: user.email, role: user.role },
    });

    return response;
  }
}
