/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
import http from 'http';
import https from 'https';
import fetch from 'node-fetch';
import type { OperationObject } from 'openapi3-ts';
import type { SchemaObject } from 'openapi3-ts';
import converter from 'swagger2openapi';
import Log from './log';
import { mockGenerator } from './mockGenerator';
import { sanitizeSchema } from './sanitizer';
import { ServiceGenerator } from './serviceGenerator';

const getImportStatement = (requestLibPath: string) => {
  if (requestLibPath && requestLibPath.startsWith('import')) {
    return requestLibPath;
  }
  if (requestLibPath) {
    return `import request from '${requestLibPath}'`;
  }
  return `import { request } from "umi"`;
};

export type GenerateServiceProps = {
  requestLibPath?: string;
  requestImportStatement?: string;
  /**
   * api 的前缀
   */
  apiPrefix?:
  | string
  | ((params: {
    path: string;
    method: string;
    functionName: string;
    autoExclude?: boolean;
  }) => string);
  /**
   * 生成的文件夹的路径
   */
  serversPath?: string;
  /**
   * Swagger 2.0 或 OpenAPI 3.0 的地址
   */
  schemaPath?: string;
  /**
   * 项目名称
   */
  projectName?: string;

  hook?: {
    /** 自定义函数名称 */
    customFunctionName?: (data: OperationObject) => string;
    /** 自定义类型名称 */
    customTypeName?: (data: OperationObject) => string;
    /** 自定义类名 */
    customClassName?: (tagName: string) => string;
  };

  /**
   * 默认为false，true时使用null代替可选
   */
  nullable?: boolean;

  mockFolder?: string;
  /**
   * 模板文件的文件路径
   */
  templatesFolder?: string;

  /**
   * 枚举样式
   */
  enumStyle?: 'string-literal' | 'enum';

  /**
   * response中数据字段
   * example: ['result', 'res']
   */
  dataFields?: string[];

  /**
   * 是否生成严格的类型定义
   */
  strictTypes?: boolean;

  /**
   * 是否使用 interface 而不是 class
   */
  useInterface?: boolean;

  /**
   * 自定义响应类型包装器
   */
  responseWrapper?: string;

  /**
   * 支持忽略的路径前缀（如 /api/v1/），用于方法名生成
   */
  ignorePathPrefix?: string | RegExp;
};

const converterSwaggerToOpenApi = (swagger: any) => {
  if (!swagger.swagger) {
    return swagger;
  }
  return new Promise((resolve, reject) => {
    converter.convertObj(swagger, {}, (err, options) => {
      Log(['💺 将 Swagger 转化为 openAPI']);
      if (err) {
        reject(err);
        return;
      }
      resolve(options.openapi);
    });
  });
};

export const getSchema = async (schemaPath: string) => {
  if (schemaPath.startsWith('http')) {
    const protocol = schemaPath.startsWith('https:') ? https : http;
    try {
      const agent = new protocol.Agent({
        rejectUnauthorized: false,
      });
      const json = await fetch(schemaPath, { agent }).then((rest) => rest.json());
      return json;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('fetch openapi error:', error);
    }
    return null;
  }
  const schema = require(schemaPath);
  return schema;
};

const getOpenAPIConfig = async (schemaPath: string) => {
  const schema = await getSchema(schemaPath);
  if (!schema) {
    return null;
  }
  const openAPI = await converterSwaggerToOpenApi(schema);
  return openAPI;
};

// 从 appName 生成 service 数据
export const generateService = async ({
  requestLibPath,
  schemaPath,
  mockFolder,
  nullable = false,
  ...rest
}: GenerateServiceProps) => {
  const openAPI = await getOpenAPIConfig(schemaPath);

  // 清理 schema 中的 HTML 实体
  const sanitizedOpenAPI = sanitizeSchema(openAPI);

  let patchedOpenAPI = sanitizedOpenAPI;

  const requestImportStatement = getImportStatement(requestLibPath);
  const serviceGenerator = new ServiceGenerator(
    {
      requestImportStatement,
      enumStyle: 'enum',
      nullable,
      ...rest,
    },
    patchedOpenAPI,
  );
  serviceGenerator.genFile();

  if (mockFolder) {
    await mockGenerator({
      openAPI: patchedOpenAPI,
      mockFolder: mockFolder || './mocks/',
    });
  }
};
