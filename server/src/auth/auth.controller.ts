import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { User } from '@supabase/supabase-js';


class AuthDto {
  email: string;
  password: string;
}

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 注册接口
   */
  @Post('register')
  async register(@Body() body: AuthDto) {
    return this.authService.register(body.email, body.password);
  }

  /**
   * 登录接口
   */
  @Post('login')
  async login(@Body() body: AuthDto) {
    return this.authService.login(body.email, body.password);
  }

  /**
   * 获取当前登录用户信息（需携带 Bearer Token）
   */
  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  async getProfile(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      lastSignInAt: user.last_sign_in_at,
      createdAt: user.created_at,
    };
  }
}
