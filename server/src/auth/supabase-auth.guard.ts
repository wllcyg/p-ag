import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('缺少 Authorization 头部信息');
    }

    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedException('Authorization 格式必须为 Bearer <token>');
    }

    const client = this.supabaseService.getClient();
    if (!client) {
      throw new UnauthorizedException('Supabase 客户端未初始化，请检查环境变量配置');
    }

    const {
      data: { user },
      error,
    } = await client.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException(error?.message || '无效或已过期的身份凭证');
    }

    // 将验证通过的用户信息注入到请求对象中
    request.user = user;
    return true;
  }
}
