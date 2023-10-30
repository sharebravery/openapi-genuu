## 介绍

根据 [OpenApi3](https://swagger.io/blog/news/whats-new-in-openapi-3-0/) 文档生成对应模型以及 request 请求代码。

- 类型即文档
- 生成可以实例化的 class，而非 interface，一行代码实例化解决无属性烦恼（new className()）
- 使用类和静态方法重新组织代码结构
- 对 API FOX 进行了适配 （java 等可以不写 swagger 注解 直接写注释 使用 api fox 生成文档和 json 文件）

## 使用

```node
yarn add  openapi-genuu -D
```

在项目根目录新建 `openapi.config.ts`

```ts
import { generateService } from 'openapi-genuu';

generateService({
  schemaPath: 'http://petstore.swagger.io/v2/swagger.json',
  serversPath: './src/.generated',
});
```

在 `package.json` 的 `script` 中添加 api: `"gen:api": "ts-node openapi.config.ts",`

生成 api

```node
npm run gen:api
```
  
# 注意 如`"type": "module"`
则: `"gen:api": "ts-node --esm openapi.config.ts"`

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

> fork by https://github.com/chenshuai2144/openapi2typescript
