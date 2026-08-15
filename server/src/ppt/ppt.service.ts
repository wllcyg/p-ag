import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { GeneratePptDto, GenEventPayload } from './types/state';
import { buildGeneratorGraph } from './graph/generator.graph';

// 简单内存缓存（生产可换 Redis）
interface CachedFile {
  buffer: Buffer;
  filename: string;
  userId: string;
  expiresAt: number;
}

@Injectable()
export class PptService {
  private readonly fileCache = new Map<string, CachedFile>();

  // 定期清理过期文件（30分钟 TTL）
  private readonly TTL_MS = 30 * 60 * 1000;

  /**
   * 启动 PPT 生成管线
   * @returns downloadToken 用于后续文件下载
   */
  async generate(
    dto: GeneratePptDto,
    userId: string,
    emit: (event: GenEventPayload) => void,
  ): Promise<{ downloadToken: string }> {
    // 构建状态机
    const graph = buildGeneratorGraph(emit);

    // 执行图
    const finalState = await graph.invoke({
      input: dto,
    });

    if (!finalState.pptxBuffer) {
      throw new Error('PPT 渲染失败：未生成文件');
    }

    // 缓存文件并返回 token
    const token = randomUUID();
    const filename = `${dto.lessonTitle}_${dto.subject}_${dto.grade}.pptx`;

    this.fileCache.set(token, {
      buffer: finalState.pptxBuffer as Buffer,
      filename,
      userId,
      expiresAt: Date.now() + this.TTL_MS,
    });

    // 清理过期缓存
    this.cleanExpiredCache();

    return { downloadToken: token };
  }

  /**
   * 根据 token 获取 PPT 文件（校验归属用户）
   */
  async getFile(token: string, userId: string): Promise<{ buffer: Buffer; filename: string }> {
    const cached = this.fileCache.get(token);
    if (!cached) {
      throw new NotFoundException('文件不存在或已过期（30分钟有效期）');
    }
    if (cached.userId !== userId) {
      throw new NotFoundException('无权访问此文件');
    }
    return { buffer: cached.buffer, filename: cached.filename };
  }

  private cleanExpiredCache() {
    const now = Date.now();
    for (const [token, cached] of this.fileCache.entries()) {
      if (cached.expiresAt < now) {
        this.fileCache.delete(token);
      }
    }
  }
}
