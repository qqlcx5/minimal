# USV 小程序重构计划

## 项目概述

将原有的原生微信小程序（miniprogram-usv/miniprogram）迁移到 unibest 框架，使用 Vue3 + TypeScript + UnoCSS 重构，并进行 UI/UX 美化。

## 核心功能

1. **蓝牙连接页面**：设备扫描、连接、状态显示
2. **地图控制页面**：地图显示、航点管理、功率/舵角控制、状态监控、设置面板

## 实施步骤

### 第一阶段：项目基础搭建

#### 1.1 类型定义

- 创建 `src/types/usv.ts`：定义船舶、航点、设备、地图标记等核心类型
- 创建 `src/types/bluetooth.ts`：定义蓝牙设备相关类型

#### 1.2 工具类迁移（TypeScript 化）

- `src/utils/crcCalc.ts`：CRC 校验计算（从 crcCalc.js 迁移）
- `src/utils/wsCoordinate.ts`：坐标转换工具（从 WScoordinate.js 迁移）
- `src/utils/stm32Com.ts`：STM32 通信协议处理（从 STM32Com.js 迁移）
- `src/utils/instruction.ts`：指令处理（从 Instruction.js 迁移）

#### 1.3 状态管理（Pinia Store）

- `src/store/usv.ts`：管理船舶数据、航点、地图标记、全局配置
- ships: 5 艘船舶的状态数据
- crossmarker: 地图十字标记
- userAccelerometer: 加速度计开关
- bleserviceuuid/bletxuuid: 蓝牙服务 UUID

### 第二阶段：页面重构

#### 2.1 首页（蓝牙连接页面）

- 创建 `src/pages/index/index.vue`
- 功能实现：
- 蓝牙适配器初始化
- 设备扫描和列表展示（使用 wot-design-uni 组件美化）
- 设备连接（带加载状态）
- 跳过功能
- 空状态提示
- 连接失败提示
- UI 优化：
- 设备列表卡片式设计，添加设备图标
- 信号强度可视化（进度条/图标）
- 连接状态指示器
- 刷新动画效果

#### 2.2 地图控制页面

- 创建 `src/pages/map/index.vue`
- 功能实现：
- 地图组件集成（uni-map）
- 蓝牙通信（发送/接收数据）
- 功率滑块控制（垂直滑块）
- 舵角滑块控制（水平滑块）
- 航点管理（添加、删除、修改、选中）
- 状态信息显示（功率、电压、速度、运行时间、连接状态）
- 设置面板（自动/手动模式、加速度计、舵机零点、磁力计标定）
- 加速度计监听（用于舵角控制）
- UI 优化：
- 地图控件现代化样式
- 滑块组件美化，实时数值显示
- 状态信息卡片式布局
- 设置面板可折叠设计
- 按钮添加图标和过渡动画

### 第三阶段：组件化改造

#### 3.1 可复用组件

- `src/components/DeviceCard.vue`：设备列表项卡片组件
- `src/components/PowerSlider.vue`：功率控制滑块组件
- `src/components/RudderSlider.vue`：舵角控制滑块组件
- `src/components/StatusCard.vue`：状态信息卡片组件
- `src/components/SettingsPanel.vue`：设置面板组件
- `src/components/MapControls.vue`：地图控制按钮组组件

### 第四阶段：样式和交互优化

#### 4.1 主题配置

- 在 `uno.config.ts` 中配置蓝色主题色彩变量
- 定义统一的间距、圆角、阴影等设计 token

#### 4.2 交互优化

- 添加页面过渡动画
- 按钮点击反馈效果
- 加载状态优化
- 操作确认提示（删除航点等）

#### 4.3 响应式设计

- 确保横屏模式下的良好显示
- 适配不同屏幕尺寸
- 优化触摸目标大小

### 第五阶段：配置和集成

#### 5.1 页面配置

- 在 `pages.config.ts` 中配置页面路由
- 设置横屏模式（pageOrientation: 'landscape'）
- 配置导航栏样式

#### 5.2 应用配置

- 在 `manifest.config.ts` 中配置小程序权限（蓝牙、定位）
- 配置应用名称和图标

#### 5.3 资源迁移

- 将图片资源从 `miniprogram-usv/miniprogram/images/` 迁移到 `src/static/images/`
- 确保所有图标路径正确

## 技术要点

### 蓝牙 API 适配

- 使用 `uni.openBluetoothAdapter()` 等 uni-app API
- 注意 API 的 Promise 化处理
- 错误处理和重连机制

### 地图组件

- 使用 `map` 组件（uni-app 原生组件）
- 处理标记点（markers）和路线（polyline）
- 地图事件处理（点击、区域变化等）

### 状态同步

- 使用 Pinia store 管理全局状态
- 使用 `uni.setStorageSync` 持久化关键数据
- 页面间数据传递

### 性能优化

- 地图渲染优化
- 定时器管理（及时清理）
- 避免不必要的重绘

## 注意事项

1. 保持所有原有功能逻辑不变
2. 确保蓝牙通信协议兼容性
3. 保持横屏显示模式
4. 遵循微信小程序开发规范
5. 使用 TypeScript 严格类型检查
6. 遵循项目编码规范（Vue、TypeScript、UnoCSS）

## 预期成果

- 现代化的 UI 设计，蓝色海洋主题
- 更直观的操作流程
- 更好的信息展示（卡片式布局）
- 流畅的交互体验（动画和反馈）
- 完整的 TypeScript 类型支持
- 组件化的代码结构，便于维护