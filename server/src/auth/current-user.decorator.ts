import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@supabase/supabase-js';

/**
 * 自定义参数装饰器：在控制器方法中直接获取已登录的 Supabase 用户对象
 * @example
 * @Get('profile')
 * @UseGuards(SupabaseAuthGuard)
 * getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as User;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
