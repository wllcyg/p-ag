import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 允许跨域请求（方便前端调用）
  app.enableCors();

  // HF Spaces 默认使用 7860 端口，且必须监听 0.0.0.0
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 7860;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://0.0.0.0:${port}`);
}
bootstrap();

