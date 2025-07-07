# OpenAPI TypeScript Service Generator

一个基于 OpenAPI/Swagger 规范生成 TypeScript 代码的工具。

## 特性

- 🚀 基于 OpenAPI 3.0 规范
- 🎯 严格的类型检查
- 📦 支持多种输出格式
- 🏷️ 所有生成文件带自动生成注释
- 🧩 方法名为小驼峰+大写 method 后缀（如 getUserById_GET）
- **参数分支智能生成**：根据 OpenAPI path/query/body/file 参数结构，自动生成最简洁、类型安全的 service 方法签名。
- **注释完整还原**：所有接口注释优先使用 OpenAPI 的 summary/description 字段，保证文档准确。
- **严格适配 OpenAPI 规范**：支持 path/query/body/file/header 等主流参数类型，兼容绝大多数后端。
- **模板健壮、无未定义变量**：所有参数分支和变量名都自动适配，无论参数组合如何都不会生成语法错误。

## 代码风格与最佳实践

- 所有类型、接口、类均为大驼峰命名（PascalCase）
- 所有 service 方法名为小驼峰+大写 method 后缀，避免重名
- 所有生成文件顶部有自动生成注释，提示勿手动修改
- 支持类型 re-export，便于统一引用
- 模板拼接更严谨，避免多余括号、逗号

## 安装

```bash
npm install openapi-genuu
```

## 使用方法

### 基本配置

#### 一、

```typescript
import { generateService } from 'openapi-genuu';

generateService({
  schemaPath: `http://localhost:8010/swagger/doc.json`,
  serversPath: './generated/orka-new',
  strictTypes: true,
});
```

#### 二、

```typescript
import { generateService } from 'openapi-genuu';

generateService({
  schemaPath: './swagger.json',
  serversPath: './src/api',
  projectName: 'api',
  namespace: 'API',
  requestImportStatement: "import { request } from 'umi';",
});
```

### 高级配置

```typescript
import { generateService } from 'openapi-genuu';

generateService({
  schemaPath: './swagger.json',
  serversPath: './src/api',
  projectName: 'api',
  namespace: 'API',
  requestImportStatement: "import { request } from 'umi';",
  strictTypes: true, // 是否启用严格类型，默认 false
  useInterface: true, // 是否使用 interface 生成类型，默认 false（参数类型仍为 class）
  responseWrapper: 'ApiResponse', // 自定义响应类型包装器，默认 undefined
  enumStyle: 'string-literal', // 枚举样式，'string-literal' | 'enum'，默认 'string-literal'
  dataFields: ['result', 'data', 'res'], // 响应数据字段，默认 undefined
  nullable: false, // 可选字段是否用 null，默认 false
  hook: {
    customFunctionName: (data) => data.operationId || data.summary,
    customTypeName: (data) => `${data.operationId}Params`,
    customClassName: (tagName) => `${tagName}Service`,
  },
});
```

## 配置项说明

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `schemaPath` | `string` | - | OpenAPI 规范文件路径，必填 |
| `serversPath` | `string` | `'./src/service'` | 生成文件输出路径 |
| `projectName` | `string` | `'api'` | 项目名称（生成的子目录） |
| `namespace` | `string` | `'API'` | 命名空间名称 |
| `requestImportStatement` | `string` | - | 请求库导入语句（如 umi/axios） |
| `strictTypes` | `boolean` | `false` | 是否启用严格类型（用 unknown 替代 any） |
| `useInterface` | `boolean` | `false` | 是否用 interface 生成类型（参数类型仍为 class） |
| `responseWrapper` | `string` | - | 自定义响应类型包装器（如 ApiResponse） |
| `enumStyle` | `'string-literal' \| 'enum'` | `'string-literal'` | 枚举样式 |
| `dataFields` | `string[]` | - | 响应数据字段（如 ['data', 'result']） |
| `nullable` | `boolean` | `false` | 可选字段是否用 null |
| `mockFolder` | `string` | - | mock 目录 |
| `hook` | `object` | - | 钩子函数，自定义命名等 |
| `hook.customFunctionName` | `(data) => string` | - | 自定义函数名生成 |
| `hook.customTypeName` | `(data) => string` | - | 自定义类型名生成 |
| `hook.customClassName` | `(tagName) => string` | - | 自定义类名生成 |
| `ignorePathPrefix` | `string | RegExp` | `/^\/api\/v\d+\//` | 用于配置在生成 API 方法名时需要忽略的路径前缀 |

## 生成的代码示例

### 参数类型（使用 class）

```typescript
export class GetUsersParams {
  /** 页码 */
  page: number = 1;
  /** 每页大小 */
  pageSize: number = 10;
  /** 用户名 */
  username?: string;
  /** 状态 */
  status?: 'active' | 'inactive';
}
```

### 数据模型（使用 interface）

```typescript
export interface User {
  /** 用户ID */
  id: string;
  /** 用户名 */
  username: string;
  /** 邮箱 */
  email?: string;
  /** 创建时间 */
  createdAt: Date;
}
```

### Service 方法

```typescript
export class UserService {
  /** 获取用户列表 */
  static async getUsers(
    params: API.GetUsersParams,
    options?: RequestOptions,
  ): Promise<API.UserListResponse> {
    return request<API.UserListResponse>({
      url: '/api/users',
      method: 'GET',
      params: {
        ...params,
      },
      ...(options || {}),
    });
  }
}
```

## 默认值说明

- `strictTypes`：默认 `false`，开启后所有 any 类型会变为 unknown。
- `useInterface`：默认 `false`，开启后数据模型用 interface，参数类型仍为 class（带默认值）。
- `enumStyle`：默认 `'string-literal'`，可选 `'enum'`。
- `nullable`：默认 `false`，可选字段不会用 null。
- `projectName`：默认 `'api'`。
- `serversPath`：默认 `'./src/service'`。
- `namespace`：默认 `'API'`。

## 许可证

MIT

## 示例

```typescript
// THIS FILE IS AUTO-GENERATED. DO NOT EDIT MANUALLY.
export class GetUserByIdParams {
  id: string;
}

export interface User {
  id: string;
  name: string;
}

export type UserType = User;

export class UserService {
  /** 获取用户信息 GET /api/v1/user/{id} */
  static async getUserById_GET(
    params: API.GetUserByIdParams,
    options?: RequestOptions,
  ): Promise<API.User> {
    return request<API.User>({
      url: `/api/v1/user/${params.id}`,
      method: 'GET',
      params: { ...params },
      ...(options || {}),
    });
  }
}
```

## 其他说明

- 生成的所有类型、接口、类均为大驼峰命名，符合 TypeScript 社区规范。
- 所有 service 方法名均为小驼峰+大写 method 后缀（如 getUserById_GET、createUser_POST）。
- 所有生成文件顶部有自动生成注释。
- 支持类型 re-export，便于业务层统一引用。
- 代码风格和模板拼接已做严格处理，避免语法错误。

## 参数分支生成规则

| path 参数 | query 参数 | body 参数 | file 参数 | 生成方法参数 | 示例 |
| --- | --- | --- | --- | --- | --- |
| 1 个 | 无 | 无 | 无 | id: string | `getById(id: string, ...)` |
| 1 个 | 无 | 有 | 无 | id: string, body: ... | `updateById(id: string, body, ...)` |
| 1 个 | 有 | 无/有 | 无/有 | params: Models.Xxx | `getList(params, ...)` |
| 多个 | 任意 | 任意 | 任意 | params: Models.Xxx | `batchUpdate(params, ...)` |
| 无 | 有/无 | 有/无 | 任意 | params: Models.Xxx | `create(params, ...)` |

- **只有 path 参数**：`id: string`
- **只有 path+body**：`id: string, body: ...`
- **其它情况（有 query/file/多个 path/无 path）**：`params: Models.XXXParams`

## 注释生成规则

- 优先用 OpenAPI 的 `summary` 字段
- 没有 `summary` 时用 `description`
- 都没有时用 `operationId`
- 注释自动带上 HTTP 方法和路径

**示例：**

```ts
/** Get captcha ID GET /api/v1/captcha/id */
static async GetCaptchaID_GET(options?: RequestOptions): Promise<...> { ... }
```

## 适配性说明

- 严格遵循 OpenAPI 3.0/Swagger 2.0 规范
- 支持 path/query/body/file/header 等主流参数类型
- 兼容绝大多数主流后端（Java/Spring、Go、Node、Python 等）生成的 OpenAPI 文档
- 模板和生成逻辑分工清晰，易于扩展和自定义

## 典型生成示例

```ts
// 只有 path 参数
static async GetById(id: string, options?: RequestOptions): Promise<...> { ... }

// 只有 path+body
static async UpdateById(id: string, body: UpdateForm, options?: RequestOptions): Promise<...> { ... }

// 只有 query 参数
static async QueryList(params: QueryListParams, options?: RequestOptions): Promise<...> { ... }

// path+query
static async QueryDetail(params: QueryDetailParams, options?: RequestOptions): Promise<...> { ... }
```

---

如需自定义参数风格、注释格式或有其它生成需求，欢迎反馈！

## 配置项说明

### ignorePathPrefix

- 类型：`string | RegExp`
- 作用：用于配置在生成 API 方法名时需要忽略的路径前缀（如 `/api/v1/`）。
- 默认值：`/^\/api\/v\d+\//`（即自动忽略 `/api/v1/`、`/api/v2/` 等版本号前缀）
- 用法：

```js
import { generateService } from './src/index';

generateService({
  // ...其他配置
  ignorePathPrefix: /^\/api\/v\d+\//, // 默认配置，忽略 /api/v1/ 这类前缀
  // ignorePathPrefix: '/api/v1/',      // 也支持字符串
});
```

- 生成方法名示例：
  - `/api/v1/current/user` → `CurrentUser_GET`
  - `/api/v1/products/{id}` → `ProductsById_GET`
  - `/api/v2/captcha/image` → `CaptchaImage_GET`

如需自定义其它前缀，只需调整 `ignorePathPrefix` 配置即可。
