# AGENTS.md

此文件为代理在处理此代码库中的代码时提供指导。

## 🚀 命令

- **开发 (H5)**: `pnpm dev`
- **开发 (微信小程序)**: `pnpm dev:mp`
- **开发 (App)**: `pnpm dev:app`
- **构建 (H5)**: `pnpm build`
- **构建 (微信小程序)**: `pnpm build:mp`
- **构建 (App)**: `pnpm build:app`
- **代码检查**: `pnpm lint` 或 `pnpm lint:fix`
- **类型检查**: `pnpm type-check`

## 架构

- **框架**: Vue 3 和 uni-app
- **语言**: TypeScript
- **包管理器**: pnpm
- **状态管理**: Pinia
- **HTTP 客户端**: Alova 和 Vue Query
- **UI 框架**: Wot Design Uni
- **CSS 工具**: UnoCSS
- **构建工具**: Vite

## 代码风格

- **缩进**: 2 个空格。
- **行尾**: LF。
- **Vue SFC 块顺序**: `<script>` 和 `<template>` 必须在 `<style>` 之前。
- **代码检查**: 基于 `@uni-helper/eslint-config`，并禁用了一些规则 (例如，`no-console`)。

## 💡 关键模式

- **自定义 Hooks**:
  - `src/hooks/useRequest.ts` 中的 `useRequest` 用于处理异步请求。
  - `src/hooks/useUpload.ts` 中的 `useUpload` 用于文件上传。
- **API 请求**:
  - 在 `src/api` 目录中定义。
  - 使用 `src/http/http.ts` 中的 `http` 对象，该对象处理请求拦截、令牌刷新和错误处理。
- **路由**:
  - 由 `@uni-helper/vite-plugin-uni-pages` 根据 `src/pages` 目录结构自动生成。
  - 子包在 `src/pages-sub` 中定义。
- **环境变量**:
  - 在项目根目录的 `env` 目录中定义。

**必须做的事**：
*   在写完整个代码之前，不要问任何澄清问题，从头到尾写完代码
*   所有交互使用中文回答
*   每个任务必须创建 todo 列表
*   深入理解需求本质，识别根本问题
*   发现并指出任何重复代码或逻辑（DRY原则）
*   评估方案的技术债务和长期维护成本
*   信息不足时主动提问收集必要信息
**禁止**：在完成分析前修改代码；急于给出解决方案；跳过理解分析步骤