import { Module } from '@nestjs/common';
import { PptController } from './ppt.controller';
import { PptService } from './ppt.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PptController],
  providers: [PptService],
})
export class PptModule {}
