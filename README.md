## 介绍

根据 [OpenApi3](https://swagger.io/blog/news/whats-new-in-openapi-3-0/) 文档生成对应模型以及 request 请求代码。

- 类型即文档
- 生成可以实例化的 class，而非 interface，一行代码实例化解决无属性烦恼（new className()）
- 使用类和静态方法重新组织代码结构
- 对 API FOX 进行了适配 （java 等可以不写 swagger 注解 直接写注释 使用 api fox 生成文档和 json 文件）

## 使用

```sh
yarn add openapi-genuu -D
# 或
pnpm add -D openapi-genuu
```

在项目根目录新建 `openapi.config.ts`

```ts
import { generateService } from 'openapi-genuu';

generateService({
  requestLibPath: "import request from '../../utils/request';",
  schemaPath: 'http://petstore.swagger.io/v2/swagger.json',
  serversPath: './src/.generated',
});
```

**推荐用法：先用 tsc 编译 openapi.config.ts，再用 node 执行**

在 `package.json` 的 `scripts` 中添加：

```json
"gen:api": "tsc openapi.config.ts && node openapi.config.js"
```

生成 api：

```sh
yarn run gen:api
# 或
pnpm run gen:api
```

> **注意**：无需再用 ts-node 或 ts-node-esm，直接用 node 跑编译后的 JS 文件即可。

## 参数

| 属性 | 必填 | 备注 | 类型 | 默认值 |
| --- | --- | --- | --- | --- |
| requestLibPath | 否 | 自定义请求方法路径 | string | - |
| requestImportStatement | 否 | 自定义请求方法表达式 | string | - |
| apiPrefix | 否 | api 的前缀 | string | - |
| serversPath | 否 | 生成的文件夹的路径 | string | - |
| schemaPath | 否 | Swagger 2.0 或 OpenAPI 3.0 的地址 | string | - |
| projectName | 否 | 项目名称 | string | - |
| namespace | 否 | 命名空间名称 | string | Models |
| mockFolder | 否 | mock 目录 | string | - |
| enumStyle | 否 | 枚举样式 | string-literal \| enum | enum |
| nullable | 否 | 使用 null 代替可选 | boolean | false |
| dataFields | 否 | response 中数据字段 | string[] | - |
