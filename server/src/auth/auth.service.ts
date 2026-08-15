import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Injectable()
export class AuthService {
  constructor(private supabaseService: SupabaseService) {}

  /**
   * 邮箱密码注册
   */
  async register(email: string, password: string) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  /**
   * 邮箱密码登录
   */
  async login(email: string, password: string) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }
}
