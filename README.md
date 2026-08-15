# 教师说课 PPT 智能生成系统 - 全栈开发计划 (Plan)

本项目是一套基于 **DeepSeek Agent + pptxgenjs + NestJS + Vue 3** 构建的教师说课 PPT 自动化生成全栈系统。教师仅需输入学科、学段与课文名称，系统即可自动分步生成标准说课教案大纲、设计教学环节与板书，并直接导出排版精美、内置演讲逐字稿备注的原生 `.pptx` 演示文稿。

---

## 一、 系统架构与技术选型

| 架构层级 | 技术选型 | 核心职责 |
| :--- | :--- | :--- |
| **后端服务 (`server/`)** | **NestJS + TypeScript** | 接收前端请求、调用 DeepSeek API、编排说课大纲、生成 PPTX、提供 SSE 流式接口 |
| **AI 编排引擎** | **DeepSeek-V3 / R1** | 专业说课六步法 Prompt 编排、强类型 JSON 结构化输出、自动分离正文与逐字稿 |
| **PPT 渲染引擎** | **`pptxgenjs`** | 纯代码绘制原生 16:9 高清幻灯片、色块排版、注入演讲者逐字稿备注（Speaker Notes） |
| **前端界面 (`web/`)** | **Vue 3 + Vite + TypeScript** | 极简教师输入表单、SSE 实时流式进度反馈、幻灯片在线卡片预览、一键下载 `.pptx` |
| **部署方案** | **Mac 本地 / 轻量云** | 本地 Node.js/PM2 常驻运行，结合 Cloudflare Tunnel 实现公网 HTTPS 访问 |

---

## 二、 DeepSeek Agent 核心角色定位

```
[教师输入: 《桂林山水》]
          ⬇
[DeepSeek Agent 大脑]
  ├─ 1. 教学法设计 (规划三维目标、重难点、5个教学环节)
  ├─ 2. 幻灯片拆解 (将文字提炼为 12~15 页卡片，分离正文与逐字稿)
  ├─ 3. 工具调度决策 (调用 pptxgenjs 渲染引擎，注入参数)
  └─ 4. 自我校验 (检查字数是否超标、环节时间是否符合10分钟说课要求)
          ⬇
[生成原生 .pptx 文件]
```

1. **特级教师角色**：严格遵循教育部“说课六步法”标准闭环，生成符合教资/公开课评分标准的三维目标与学情分析。
2. **幻灯片架构师角色**：画面只保留提炼后的核心卡片要点（每句 <15 字），将详尽说课逐字稿自动写入底部的演讲者备注栏（Speaker Notes）。
3. **工具调度员角色**：输出强类型 JSON 数据，驱动 `pptxgenjs` 完成原生文件渲染。
4. **质检反思角色**：自动检查字数与版面，防止文字溢出。

---

## 三、 四阶段开发实施路线图

### 阶段一：后端核心服务与 PPT 渲染引擎（`server/`）
- [ ] **1.1 依赖安装与环境配置**
  - 安装核心依赖：`pptxgenjs`、`openai`、`dotenv`、`class-validator`、`class-transformer`
  - 配置 `server/.env`（`DEEPSEEK_API_KEY`、`PORT=3000`、`OUTPUT_DIR=./output`）
- [ ] **1.2 教师说课专业 Prompt 编排（`PptPromptService`）**
  - 固化“说课六步法”结构：
    1. **说教材**：教材地位分析、三维教学目标（知识与技能/过程与方法/情感态度价值观）、教学重难点
    2. **说学情**：学生认知水平、前置基础、易错点与心理特征
    3. **说教法学法**：情境探究法、启发诱导法、小组合作法
    4. **说教学过程**（5大环节分配）：创设情境导入(3min) ➜ 师生互动探究(15min) ➜ 分层巩固(10min) ➜ 归纳小结(5min) ➜ 课后延伸(2min)
    5. **说板书设计**：提纲式 / 图解式结构板书
    6. **说教学反思/亮点**：教学设计创新点
  - 约束模型输出为规范的强类型 JSON 数组
- [ ] **1.3 原生 PPTX 渲染与逐字稿注入（`PptExportService`）**
  - 基于 `pptxgenjs` 构建 16:9 高清母版与雅致教育配色体系（深蓝/中国红/科技蓝）
  - 将每页对应的**说课逐字稿**注入到 PPT 底部的 `Speaker Notes`（演讲者备注栏）
- [ ] **1.4 SSE 流式生成接口实现（`PptController`）**
  - 接口路由：`POST /api/ppt/generate-stream`
  - 实时向客户端推送生成进度事件：`{ step: 'OUTLINE', progress: 30, message: '正在分析教材重难点...' }`
  - 生成完毕后推送下载 URL：`{ step: 'DONE', progress: 100, downloadUrl: '/api/ppt/download/xxx.pptx' }`

---

### 阶段二：前端界面与流式交互（`web/`）
- [ ] **2.1 前端基础环境搭建**
  - 安装依赖：`element-plus`、`@element-plus/icons-vue`、`axios`
- [ ] **2.2 教师输入主界面开发（`Home.vue`）**
  - 表单输入项：学科选择（语文/数学/英语/物理等）、学段（小学/初中/高中）、课题名称、教材版本（人教/部编/北师大版）
  - 支持可选填入补充要求（如“重点突出情境教学”、“教资面试 10 分钟试讲标准”）
- [ ] **2.3 SSE 实时流式进度展示组件**
  - 动态展示当前 Agent 正在进行的动作（构思大纲 ➜ 撰写教学环节 ➜ 排版幻灯片 ➜ 渲染导出）
  - 环形进度条与微动效反馈
- [ ] **2.4 幻灯片在线卡片式预览与下载**
  - 将生成的页面数据渲染为精致的卡片预览列表，展示每页标题、核心要点与逐字稿
  - 提供高亮 **【下载完整 .pptx 文件】** 按钮

---

### 阶段三：学科定制与视觉增强
- [ ] **3.1 多学科主题配色自动切换**
  - **语文**：典雅中国风（朱红 / 青绿 / 米白）
  - **数学 / 物理**：严谨科技风（深蓝 / 湖蓝 / 浅灰）
  - **英语 / 艺术**：活力国际风（明黄 / 暖橙 / 墨绿）
- [ ] **3.2 板书设计结构化图形生成**
  - 提供提纲式板书、图示结构式板书的自动卡片化排版

---

### 阶段四：全链路联调与 Mac 本地部署
- [ ] **4.1 端到端全链路联调测试**
  - 验证语文、数学等多篇真实课文的生成质量与下载后 Office/WPS 打开兼容性
- [ ] **4.2 Mac 本地常驻服务部署**
  - 使用 `pm2` 启动并守护后端 NestJS 服务
  - 配置 Cloudflare Tunnel / cpolar 映射本地端口，生成公网 HTTPS 访问域名直接提供给用户

---

## 四、 数据契约定义（Data Contracts）

### 1. 生成请求入参（DTO）
```typescript
export class GeneratePptDto {
  subject: string;          // 学科，如 "语文"
  grade: string;            // 学段，如 "小学三年级"
  lessonTitle: string;      // 课题名称，如 "桂林山水"
  textbookVersion?: string; // 教材版本，如 "人教部编版"
  extraRequirement?: string;// 特殊要求，如 "用于教资面试说课"
}
```

### 2. 单页幻灯片数据模型（SlideItem）
```typescript
export interface SlideItem {
  pageIndex: number;
  type: 'cover' | 'catalog' | 'material' | 'student' | 'method' | 'process' | 'board' | 'summary';
  title: string;          // 幻灯片标题
  subtitle?: string;      // 副标题
  points: string[];       // 页面核心要点卡片
  speakerNotes: string;   // 说课逐字稿（写入PPT备注栏）
}
```

---

## 五、 成果验收标准
1. **可用性**：教师输入课题后，能在 **30~60 秒内** 获得包含完整“说课六步法”的 12~16 页 `.pptx` 文件。
2. **兼容性**：下载的文件可在 Microsoft PowerPoint 2016+、WPS Office、Keynote 中直接打开并自由编辑修改。
3. **专业度**：生成的逐字稿完全契合真实说课赛制与教资评委评分标准。
