# OpenAPI TypeScript Service Generator

一个基于 OpenAPI/Swagger 规范生成 TypeScript 代码的工具，支持生成类型安全的 API 服务、数据模型和 Mock 数据。

## ✨ 特性

- 🚀 **基于 OpenAPI 3.0 规范**：支持 OpenAPI 3.0 和 Swagger 2.0 规范
- 🎯 **严格的类型检查**：生成完整的 TypeScript 类型定义
- 📦 **多种输出格式**：支持 class 和 interface 两种类型生成方式
- 🏷️ **智能参数分支**：根据 path/query/body/file 参数自动生成最优方法签名
- 📝 **注释完整还原**：优先使用 OpenAPI 的 summary/description 字段
- 🎭 **Mock 数据生成**：基于 OpenAPI 规范自动生成 Mock 数据
- 🔧 **高度可配置**：支持自定义模板、命名规则、响应包装器等
- 🛡️ **健壮性保证**：模板拼接严谨，避免语法错误

## 📦 安装

```bash
npm install openapi-genuu
```

## 🚀 快速开始

### 基础用法

```typescript
import { generateService } from 'openapi-genuu';

// 从远程地址生成
await generateService({
  schemaPath: 'http://localhost:8010/swagger/doc.json',
  serversPath: './generated/api',
  strictTypes: true,
});

// 从本地文件生成
await generateService({
  schemaPath: './swagger.json',
  serversPath: './src/api',
  projectName: 'api',
  requestImportStatement: "import { request } from 'umi';",
});
```

### 高级配置

```typescript
import { generateService } from 'openapi-genuu';

await generateService({
  schemaPath: './swagger.json',
  serversPath: './src/api',
  projectName: 'api',
  requestImportStatement: "import { request } from 'umi';",
  strictTypes: true,
  useInterface: true,
  responseWrapper: 'ApiResponse',
  enumStyle: 'string-literal',
  dataFields: ['result', 'data', 'res'],
  nullable: false,
  mockFolder: './mocks',
  ignorePathPrefix: /^\/api\/v\d+\//,
  hook: {
    customFunctionName: (data) => data.operationId || data.summary,
    customTypeName: (data) => `${data.operationId}Params`,
    customClassName: (tagName) => `${tagName}Service`,
  },
});
```

## ⚙️ 配置项

| 配置项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `schemaPath` | `string` | - | OpenAPI 规范文件路径（必填） |
| `serversPath` | `string` | `'./src/service'` | 生成文件输出路径 |
| `projectName` | `string` | `'api'` | 项目名称（生成的子目录） |
| `namespace` | `string` | `'API'` | 命名空间名称 |
| `requestImportStatement` | `string` | `"import { request } from 'umi'"` | 请求库导入语句 |
| `requestLibPath` | `string` | - | 请求库路径（与 requestImportStatement 二选一） |
| `strictTypes` | `boolean` | `false` | 启用严格类型（用 unknown 替代 any） |
| `useInterface` | `boolean` | `false` | 使用 interface 生成数据模型 |
| `responseWrapper` | `string` | - | 自定义响应类型包装器 |
| `enumStyle` | `'string-literal' \| 'enum'` | `'string-literal'` | 枚举样式 |
| `dataFields` | `string[]` | - | 响应数据字段（如 ['data', 'result']） |
| `nullable` | `boolean` | `false` | 可选字段是否使用 null |
| `mockFolder` | `string` | - | Mock 数据生成目录 |
| `templatesFolder` | `string` | `'./templates'` | 自定义模板目录 |
| `apiPrefix` | `string \| function` | - | API 路径前缀 |
| `ignorePathPrefix` | `string \| RegExp` | `/^\/api\/v\d+\//` | 忽略的路径前缀 |
| `hook` | `object` | - | 自定义钩子函数 |
| `hook.customFunctionName` | `function` | - | 自定义函数名生成 |
| `hook.customTypeName` | `function` | - | 自定义类型名生成 |
| `hook.customClassName` | `function` | - | 自定义类名生成 |

## 📁 生成的文件结构

```
src/api/
├── models/
│   ├── index.ts          # 所有模型类型导出
│   ├── User.ts           # 用户模型
│   └── Order.ts          # 订单模型
├── UserService.ts        # 用户相关 API
├── OrderService.ts       # 订单相关 API
└── index.ts              # 服务导出文件
```

## 📝 生成的代码示例

### 数据模型（useInterface: false）

```typescript
// THIS FILE IS AUTO-GENERATED. DO NOT EDIT MANUALLY.
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

### 数据模型（useInterface: true）

```typescript
// THIS FILE IS AUTO-GENERATED. DO NOT EDIT MANUALLY.
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
// THIS FILE IS AUTO-GENERATED. DO NOT EDIT MANUALLY.
import { GetUsersParams, User, RequestOptions } from './models';

export class UserService {
  /** 获取用户列表 GET /api/users */
  static async getUsers(params: API.GetUsersParams, options?: RequestOptions): Promise<API.User[]> {
    return request<API.User[]>({
      url: '/api/users',
      method: 'GET',
      params: { ...params },
      ...(options || {}),
    });
  }

  /** 获取用户详情 GET /api/users/{id} */
  static async getUserById_GET(id: string, options?: RequestOptions): Promise<API.User> {
    return request<API.User>({
      url: `/api/users/${id}`,
      method: 'GET',
      ...(options || {}),
    });
  }

  /** 创建用户 POST /api/users */
  static async createUser_POST(
    body: API.CreateUserBody,
    options?: RequestOptions,
  ): Promise<API.User> {
    return request<API.User>({
      url: '/api/users',
      method: 'POST',
      data: body,
      ...(options || {}),
    });
  }
}
```

## 🎭 Mock 数据生成

当配置 `mockFolder` 时，会自动生成基于 OpenAPI 规范的 Mock 数据：

```typescript
// 配置 Mock 生成
await generateService({
  schemaPath: './swagger.json',
  mockFolder: './mocks',
  // ... 其他配置
});
```

生成的 Mock 文件示例：

```typescript
// @ts-ignore
import { Request, Response } from 'express';

export default {
  'GET /api/users': (req: Request, res: Response) => {
    res.status(200).send([
      {
        id: '1',
        username: '张三',
        email: 'zhangsan@example.com',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ]);
  },
  'POST /api/users': (req: Request, res: Response) => {
    res.status(200).send({
      id: '2',
      username: '李四',
      email: 'lisi@example.com',
      createdAt: '2024-01-01T00:00:00.000Z',
    });
  },
};
```

## 🔧 参数分支生成规则

| path 参数 | query 参数 | body 参数 | file 参数 | 生成方法参数 | 示例 |
| --- | --- | --- | --- | --- | --- |
| 1 个 | 无 | 无 | 无 | `id: string` | `getUserById_GET(id: string, ...)` |
| 1 个 | 无 | 有 | 无 | `id: string, body: ...` | `updateUser_PUT(id: string, body, ...)` |
| 1 个 | 有 | 无/有 | 无/有 | `params: Models.XXX` | `getUsers_GET(params, ...)` |
| 多个 | 任意 | 任意 | 任意 | `params: Models.XXX` | `batchUpdate_PUT(params, ...)` |
| 无 | 有/无 | 有/无 | 任意 | `params: Models.XXX` | `createUser_POST(params, ...)` |

## 📝 注释生成规则

- **优先级**：`summary` > `description` > `operationId`
- **格式**：`/** 接口描述 HTTP方法 路径 */`
- **示例**：`/** 获取用户信息 GET /api/users/{id} */`

## 🎯 方法命名规则

- **格式**：`小驼峰 + 大写方法后缀`
- **示例**：`getUserById_GET`、`createUser_POST`、`updateUser_PUT`
- **路径前缀忽略**：默认忽略 `/api/v1/` 等版本前缀
- **自定义**：可通过 `ignorePathPrefix` 配置忽略的前缀

## 🔄 类型生成规则

### 基础类型映射

| OpenAPI 类型 | TypeScript 类型           |
| ------------ | ------------------------- |
| `string`     | `string`                  |
| `integer`    | `number`                  |
| `number`     | `number`                  |
| `boolean`    | `boolean`                 |
| `array`      | `T[]`                     |
| `object`     | `Record<string, unknown>` |
| `date-time`  | `Date`                    |

### 枚举类型

```typescript
// enumStyle: 'string-literal'
type Status = 'active' | 'inactive' | 'pending';

// enumStyle: 'enum'
enum Status {
  Active = 'active',
  Inactive = 'inactive',
  Pending = 'pending',
}
```

## 🛠️ 自定义配置

### 自定义模板

```typescript
await generateService({
  // ... 其他配置
  templatesFolder: './custom-templates',
});
```

### 自定义命名规则

```typescript
await generateService({
  // ... 其他配置
  hook: {
    customFunctionName: (data) => data.operationId || data.summary,
    customTypeName: (data) => `${data.operationId}Params`,
    customClassName: (tagName) => `${tagName}Service`,
  },
});
```

### 自定义 API 前缀

```typescript
await generateService({
  // ... 其他配置
  apiPrefix: '/api/v1',
  // 或使用函数
  apiPrefix: ({ path, method, namespace, functionName }) => {
    return `/api/v1${path}`;
  },
});
```

## 🔧 常见问题

### Q: 如何处理复杂的 OpenAPI 规范？

A: 工具支持 OpenAPI 3.0 和 Swagger 2.0，会自动转换格式。对于复杂的嵌套类型，会生成对应的 TypeScript 类型。

### Q: 如何自定义生成的代码风格？

A: 可以通过 `templatesFolder` 配置自定义模板，或使用 `hook` 函数自定义命名规则。

### Q: Mock 数据如何生成？

A: 配置 `mockFolder` 后，会基于 OpenAPI 的 `example` 字段和字段名智能生成 Mock 数据。

### Q: 如何处理文件上传？

A: 工具会自动识别 `multipart/form-data` 类型的请求，生成对应的文件上传方法。

## 📄 License

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**注意**：生成的文件包含自动生成注释，请勿手动修改，重新生成时会覆盖。
