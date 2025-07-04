# OpenAPI Generator

一个基于 OpenAPI/Swagger 规范生成 TypeScript 代码的工具。

## 特性

- 🚀 基于 OpenAPI 3.0 规范
- 📝 生成 TypeScript 类型定义
- 🔧 支持自定义模板
- 🎯 严格的类型检查
- 📦 支持多种输出格式

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
| --- | --- | --- | --- |
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
