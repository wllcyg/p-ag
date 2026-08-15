# 教师说课 PPT 智能生成系统 (p-ag)

基于 NestJS + LangGraph.js + pptxgenjs + Vue3 构建的教师说课 PPT 智能生成系统。

## 项目特点
- **多阶段 Agent 生成管线**：基于 LangGraph.js StateGraph 实现思考流、结构化转换、Schema 校验与自修复循环。
- **纯代码渲染**：使用 pptxgenjs 纯函数生成标准 16:9 幻灯片与演讲者逐字稿（Speaker Notes）。
- **云端部署就绪**：支持 Hugging Face Spaces (Docker) 容器化部署，采用 Infisical 进行配置与密钥管理。

## 目录结构
- `server/`：NestJS 后端服务与生成核心
- `web/`：Vue3 前端交互界面
- `PLAN.md`：架构设计与开发规划方案
