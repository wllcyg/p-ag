import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  Get,
  Param,
} from '@nestjs/common';
import type { Response } from 'express';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { User } from '@supabase/supabase-js';
import { GeneratePptDto } from './types/state';
import { PptService } from './ppt.service';

@Controller('api/ppt')
@UseGuards(SupabaseAuthGuard)
export class PptController {
  constructor(private readonly pptService: PptService) {}

  /**
   * SSE 流式生成接口
   * POST /api/ppt/generate-stream
   */
  @Post('generate-stream')
  async generateStream(
    @Body() dto: GeneratePptDto,
    @Res() res: Response,
    @CurrentUser() user: User,
  ) {
    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    // 辅助函数：推送 SSE 事件
    const sendEvent = (data: object) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // 启动生成管线，通过回调推送 SSE 事件
      const { downloadToken } = await this.pptService.generate(dto, user.id, sendEvent);

      // 发送完成事件（含下载链接）
      sendEvent({
        type: 'done',
        step: 'DONE',
        progress: 100,
        message: '🎉 PPT 生成完成！',
        downloadUrl: `/api/ppt/download/${downloadToken}`,
      });
    } catch (err: any) {
      sendEvent({
        type: 'error',
        step: 'DONE',
        progress: 0,
        message: `生成失败：${err?.message || '未知错误'}`,
      });
    } finally {
      res.end();
    }
  }

  /**
   * 文件下载接口
   * GET /api/ppt/download/:token
   */
  @Get('download/:token')
  async downloadPptx(
    @Param('token') token: string,
    @Res() res: Response,
    @CurrentUser() user: User,
  ) {
    const { buffer, filename } = await this.pptService.getFile(token, user.id);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }
}
