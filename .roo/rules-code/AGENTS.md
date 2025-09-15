# 项目编码规则 (仅限非显而易见部分)

- **自定义 Hooks**: 异步操作始终使用 `src/hooks/useRequest.ts` 中的 `useRequest`，文件上传使用 `src/hooks/useUpload.ts` 中的 `useUpload`。
- **API 请求**: 所有 API 调用都必须使用 `src/http/http.ts` 中的 `http` 对象。这确保了请求拦截、令牌刷新和错误处理的统一应用。
- **路由**: 路由是根据 `src/pages` 中的文件结构自动生成的。子包必须放在 `src/pages-sub` 中。
- **环境变量**: 项目特定的环境变量在项目根目录的 `env` 目录中管理。不要在根目录中使用 `.env` 文件。
- **状态管理**: 使用 Pinia 进行状态管理。状态存储位于 `src/store` 目录中。