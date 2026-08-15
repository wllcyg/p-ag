# 猫猫 Agent (Cat Agent) 🐾

基于 NestJS + LangGraph.js + pptxgenjs + Vue3 构建的猫猫智能演示与课件生成系统。

## 项目特点
- **多阶段 Agent 生成管线**：基于 LangGraph.js StateGraph 实现思考流、结构化转换、Schema 校验与自修复循环。
- **纯代码渲染**：使用 pptxgenjs 纯函数生成标准 16:9 幻灯片与演讲者逐字稿（Speaker Notes）。
- **现代全栈鉴权**：基于 Supabase Auth 的轻量化身份认证体系与路由守卫。
- **本地 Docker 极速部署**：支持使用 Docker Compose 一键启动后端容器服务。

---

## 本地 Docker 服务运维指南

在项目根目录下，使用 Docker Compose 进行日常启动与维护：

### 1. 一键构建并启动后端容器
```bash
docker compose up -d --build
```

### 2. 实时查看后端日志
```bash
docker compose logs -f
```

### 3. 重启 / 停止服务
```bash
# 重启服务
docker compose restart

# 停止并移除容器
docker compose down
```

---

## 前端开发与运行
```bash
cd web
pnpm install
pnpm dev
```
访问 `http://localhost:5173` 即可直接连通本地 Docker 后端服务！
