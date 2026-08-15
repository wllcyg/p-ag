import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private client: SupabaseClient;
  private adminClient: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!supabaseUrl || !supabaseAnonKey) {
      this.logger.warn(
        'SUPABASE_URL or SUPABASE_ANON_KEY is not defined in environment variables.',
      );
    } else {
      this.client = createClient(supabaseUrl, supabaseAnonKey);
    }

    if (supabaseUrl && supabaseServiceRoleKey) {
      this.adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
  }

  /**
   * 获取普通 Supabase 客户端 (Anon Key)
   */
  getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * 获取管理员 Supabase 客户端 (Service Role Key)
   */
  getAdminClient(): SupabaseClient {
    return this.adminClient || this.client;
  }
}
