# ==========================================
# 阶段 1: 构建 (Builder)
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖清单，利用缓存层加速构建
COPY package*.json ./
RUN npm ci

# 复制源码并编译 TypeScript
COPY . .
RUN npm run build

# 清理开发依赖，仅保留生产依赖
RUN npm prune --production

# ==========================================
# 阶段 2: 运行 (Runner)
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# 安装 curl 与 bash，并通过官方源安装 Infisical CLI
RUN apk add --no-cache curl bash \
    && curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.alpine.sh' | bash \
    && apk add --no-cache infisical

# 设置默认运行环境
ENV NODE_ENV=production
ENV PORT=7860

# 复制生产依赖和编译产物
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# 复制启动入口脚本
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# 切换为非 root 用户 (UID 1000) 保证安全
USER node

# 暴露 HF Spaces 端口
EXPOSE 7860

# 使用智能启动脚本（检测 Infisical 配置）
ENTRYPOINT ["./entrypoint.sh"]
