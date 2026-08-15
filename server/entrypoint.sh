#!/bin/sh
set -e

# 如果配置了 Infisical Token 或 Client ID，则使用 Infisical 注入环境变量启动
if [ -n "$INFISICAL_TOKEN" ] || [ -n "$INFISICAL_CLIENT_ID" ]; then
    echo "[Entrypoint] Detected Infisical credentials, starting app with Infisical CLI..."
    
    # 默认拉取 prod 环境配置，可通过 INFISICAL_ENV 覆盖（如 staging / dev）
    ENV_NAME="${INFISICAL_ENV:-prod}"
    
    exec infisical run --env="$ENV_NAME" -- node dist/main.js
else
    echo "[Entrypoint] No Infisical credentials detected, starting app with native environment variables..."
    exec node dist/main.js
fi
