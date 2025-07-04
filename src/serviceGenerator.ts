import { existsSync, readFileSync } from 'fs';
import glob from 'glob';
import * as nunjucks from 'nunjucks';
import type {
  ContentObject,
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  PathItemObject,
  ReferenceObject,
  RequestBodyObject,
  ResponseObject,
  ResponsesObject,
  SchemaObject,
} from 'openapi3-ts';
import { join } from 'path';
import ReservedDict from 'reserved-words';
import rimraf from 'rimraf';
import pinyin from 'tiny-pinyin';
import type { GenerateServiceProps } from './index';
import Log from './log';
import { getInitialValue, stripDot, writeFile } from './util';

const BASE_DIRS = ['service', 'services'];

export type TypescriptFileType = 'model' | 'interface' | 'serviceController' | 'serviceIndex';

export interface APIDataType extends OperationObject {
  path: string;
  method: string;
}

export type TagAPIDataType = Record<string, APIDataType[]>;

export interface MappingItemType {
  antTechApi: string;
  popAction: string;
  popProduct: string;
  antTechVersion: string;
}

export interface ControllerType {
  fileName: string;
  controllerName: string;
}

export const getPath = () => {
  const cwd = process.cwd();
  return existsSync(join(cwd, 'src')) ? join(cwd, 'src') : cwd;
};

// 类型声明过滤关键字
const resolveTypeName = (typeName: string) => {
  if (ReservedDict.check(typeName)) {
    return `__openAPI__${typeName}`;
  }
  const typeLastName = typeName.split('/').pop().split('.').pop();

  // const name = typeLastName
  //   .replace(/[-_ ](\w)/g, (_all, letter) => letter.toUpperCase())
  //   .replace(/[^\w^\s^\u4e00-\u9fa5]/gi, '');

  const name = typeLastName
    .replace(/[-_ ](\w)/g, (_all, letter) => letter.toUpperCase())
    .replace(/%C2%AB/g, `<${'Models.'}`)
    .replace(/%C2%BB/g, '>');

  // 当model名称是number开头的时候，ts会报错。这种场景一般发生在后端定义的名称是中文
  if (name === '_' || /^\d+$/.test(name)) {
    Log(
      `⚠️ name：[${name}], models不能以number开头，原因可能是Model定义名称为中文, 建议联系后台修改`,
    );
    return `Pinyin_${name}`;
  }
  if (!/[\u3220-\uFA29]/.test(name) && !/^\d$/.test(name)) {
    return name;
  }
  const noBlankName = name.replace(/ +/g, '');
  return pinyin.convertToPinyin(noBlankName, '', true);
};

function getRefName(refObject: any): string {
  if (typeof refObject !== 'object' || !refObject.$ref) {
    return refObject;
  }

  const refPaths = refObject.$ref.split('/');
  return resolveTypeName(refPaths[refPaths.length - 1]) as string;
}

const getType = (schemaObject: SchemaObject | undefined, addModelsPrefix: boolean = true): string => {
  if (schemaObject === undefined || schemaObject === null) {
    return 'unknown';
  }
  if (typeof schemaObject !== 'object') {
    return schemaObject;
  }
  if (schemaObject.$ref) {
    const typeName = getRefName(schemaObject);
    return addModelsPrefix ? `Models.${typeName}` : typeName;
  }

  let { type } = schemaObject as any;

  const numberEnum = [
    'int64',
    'integer',
    'long',
    'float',
    'double',
    'number',
    'int',
    'float',
    'double',
    'int32',
    'int64',
  ];

  const dateEnum = ['Date', 'date', 'dateTime', 'date-time', 'datetime'];

  const stringEnum = ['string', 'email', 'password', 'url', 'byte', 'binary'];

  if (numberEnum.includes(schemaObject.format)) {
    type = 'number';
  }

  if (schemaObject.enum) {
    type = 'enum';
  }

  function checkBaseType(type) {
    if (numberEnum.includes(type)) {
      return 'number';
    }

    if (dateEnum.includes(type)) {
      return 'Date';
    }

    if (stringEnum.includes(type)) {
      return 'string';
    }

    if (type === 'boolean') {
      return 'boolean';
    }

    return 'unknown';
  }

  if (Array.isArray(type)) {
    const [trulyType, required] = type;

    return checkBaseType(trulyType);
  }

  const invalidType = checkBaseType(type);

  if (invalidType !== 'unknown') return invalidType;

  if (type === 'array') {
    let { items } = schemaObject;
    if (schemaObject.schema) {
      items = schemaObject.schema.items;
    }

    if (Array.isArray(items)) {
      const arrayItemType = (items as any)
        .map((subType) => getType(subType.schema || subType, addModelsPrefix))
        .toString();
      return `[${arrayItemType}]`;
    }
    const arrayType = getType(items, addModelsPrefix);
    return arrayType.includes(' | ') ? `(${arrayType})[]` : `${arrayType}[]`;
  }

  if (schemaObject && schemaObject.enum && !addModelsPrefix) {
    return Array.from(
      new Set(
        schemaObject.enum.map((v) =>
          typeof v === 'string' ? `"${v.replace(/"/g, '"')}"` : getType(v, addModelsPrefix),
        ),
      ),
    ).join(' | ');
  }

  if (schemaObject.oneOf && schemaObject.oneOf.length) {
    return schemaObject.oneOf.map((item) => getType(item, addModelsPrefix)).join(' | ');
  }
  if (schemaObject.allOf && schemaObject.allOf.length) {
    return `(${schemaObject.allOf.map((item) => getType(item, addModelsPrefix)).join(' & ')})`;
  }
  if (schemaObject.type === 'object' || schemaObject.properties) {
    if (!Object.keys(schemaObject.properties || {}).length) {
      return 'Record<string, unknown>';
    }
    return `{ ${Object.keys(schemaObject.properties)
      .map((key) => {
        const required =
          'required' in (schemaObject.properties[key] || {})
            ? ((schemaObject.properties[key] || {}) as any).required
            : false;
        /**
         * 将类型属性变为字符串，兼容错误格式如：
         * 3d_tile(数字开头)等错误命名，
         * 在后面进行格式化的时候会将正确的字符串转换为正常形式，
         * 错误的继续保留字符串。
         * */
        return `'${key}'${required ? '' : '?'}: ${getType(
          schemaObject.properties && schemaObject.properties[key],
          addModelsPrefix,
        )}; `;
      })
      .join('')}}`;
  }
  return 'unknown';
};

export const getGenInfo = (isDirExist: boolean, appName: string, absSrcPath: string) => {
  // dir 不存在，则没有占用，且为第一次
  if (!isDirExist) {
    return [false, true];
  }
  const indexList = glob.sync(`@(${BASE_DIRS.join('|')})/${appName}/index.@(js|ts)`, {
    cwd: absSrcPath,
  });
  // dir 存在，且 index 存在
  if (indexList && indexList.length) {
    const indexFile = join(absSrcPath, indexList[0]);
    try {
      const line = (readFileSync(indexFile, 'utf-8') || '').split(/\r?\n/).slice(0, 3).join('');
      // dir 存在，index 存在， 且 index 是我们生成的。则未占用，且不是第一次
      if (line.includes('// API 更新时间：')) {
        return [false, false];
      }
      // dir 存在，index 存在，且 index 内容不是我们生成的。此时如果 openAPI 子文件存在，就不是第一次，否则是第一次
      return [true, !existsSync(join(indexFile, 'openAPI'))];
    } catch (e) {
      // 因为 glob 已经拿到了这个文件，但没权限读，所以当作 dirUsed, 在子目录重新新建，所以当作 firstTime
      return [true, true];
    }
  }
  // dir 存在，index 不存在, 冲突，第一次要看 dir 下有没有 openAPI 文件夹
  return [
    true,
    !(
      existsSync(join(absSrcPath, BASE_DIRS[0], appName, 'openAPI')) ||
      existsSync(join(absSrcPath, BASE_DIRS[1], appName, 'openAPI'))
    ),
  ];
};

const DEFAULT_SCHEMA: SchemaObject = {
  type: 'object',
  properties: { id: { type: 'number' } },
};

const DEFAULT_PATH_PARAM: ParameterObject = {
  in: 'path',
  name: null,
  schema: {
    type: 'string',
  },
  required: true,
  isObject: false,
  type: 'string',
};

// 工具函数：转大驼峰
function toPascalCase(str: string): string {
  return str
    .replace(/(^|_|-|\s)+(\w)/g, (_, __, c) => c ? c.toUpperCase() : '')
    .replace(/^[a-z]/, c => c.toUpperCase());
}

// 判断是否为只包含一个 path 参数的 params 类型 class
function shouldSkipSinglePathParamClass(props: any[][]) {
  return (
    props.length === 1 &&
    props[0].length === 1 &&
    props[0][0].name === 'id' &&
    (props[0][0].in === 'path' || props[0][0].in === undefined)
  );
}

class ServiceGenerator {
  protected apiData: TagAPIDataType = {};

  protected classNameList: ControllerType[] = [];

  protected version: string;

  protected mappings: MappingItemType[] = [];

  protected finalPath: string;

  protected config: GenerateServiceProps;
  protected openAPIData: OpenAPIObject;

  constructor(config: GenerateServiceProps, openAPIData: OpenAPIObject) {

    this.finalPath = '';
    this.config = {
      projectName: 'api',
      templatesFolder: join(__dirname, '../', 'templates'),
      ...config,
    };
    this.openAPIData = openAPIData;
    const { info } = openAPIData;
    const basePath = '';
    this.version = info.version;
    Object.keys(openAPIData.paths || {}).forEach((p) => {
      const pathItem: PathItemObject = openAPIData.paths[p];
      ['get', 'put', 'post', 'delete', 'patch'].forEach((method) => {
        const operationObject: OperationObject = pathItem[method];
        if (!operationObject) {
          return;
        }

        // const tags = pathItem['x-swagger-router-controller']
        //   ? [pathItem['x-swagger-router-controller']]
        //   : operationObject.tags || [operationObject.operationId] || [
        //       p.replace('/', '').split('/')[1],
        //     ];

        const tags = operationObject['x-swagger-router-controller']
          ? [operationObject['x-swagger-router-controller']]
          : operationObject.tags || [operationObject.operationId] || [
            p.replace('/', '').split('/')[1],
          ];

        tags.forEach((tagString) => {
          const tag = resolveTypeName(tagString);

          if (!this.apiData[tag]) {
            this.apiData[tag] = [];
          }
          this.apiData[tag].push({
            path: `${basePath}${p}`,
            method,
            ...operationObject,
          });
        });
      });
    });
  }

  public genFile() {
    const basePath = this.config.serversPath || './src/service';
    try {
      const finalPath = join(basePath, this.config.projectName);

      this.finalPath = finalPath;
      glob
        .sync(`${finalPath}/**/*`)
        .filter((ele) => !ele.includes('_deperated'))
        .forEach((ele) => {
          rimraf.sync(ele);
        });
    } catch (error) {
      Log(`🚥 serves 生成失败: ${error}`);
    }

    const FILE_TYPE: TypescriptFileType = 'model';

    const uniqueModelTP = this.getModelTP().filter((obj, index, self) => {
      return self.findIndex(o => o.typeName === obj.typeName) === index;
    });

    // 生成 ts 类型声明 'typings.d.ts'
    this.genFileFromTemplate(FILE_TYPE === 'model' ? 'models.ts' : 'typings.d.ts', FILE_TYPE, {
      nullable: this.config.nullable,
      list: uniqueModelTP,
      disableTypeCheck: false,
    });
    // 生成 controller 文件
    const prettierError = [];
    // 生成 service 统计
    this.getServiceTP().forEach((tp) => {
      // 根据当前数据源类型选择恰当的 controller 模版
      const template = 'serviceController';
      const hasError = this.genFileFromTemplate(
        this.getFinalFileName(`${tp.className}.ts`),
        template,
        {
          requestImportStatement: this.config.requestImportStatement,
          disableTypeCheck: false,
          className: tp.className,
          ...tp,
        },
      );
      prettierError.push(hasError);
    });

    if (prettierError.includes(true)) {
      Log(`🚥 格式化失败，请检查 service 文件内可能存在的语法错误`);
    }
    // 生成 index 文件
    this.genFileFromTemplate(`index.ts`, 'serviceIndex', {
      list: this.classNameList,
      disableTypeCheck: false,
    });

    // 打印日志
    Log(`✅ 成功生成 service 文件`);
  }

  public concatOrNull = (...arrays) => {
    const c = [].concat(...arrays.filter(Array.isArray));
    return c.length > 0 ? c : null;
  };

  public getFuncationName(data: APIDataType) {
    const { operationId, summary, path, method } = data;
    const functionName = this.config?.hook?.customFunctionName?.(data) || operationId || summary;

    let baseName: string;
    if (functionName) {
      baseName = toPascalCase(functionName);
    } else {
      const pathSegments = path.split('/').filter(Boolean);
      const lastSegment = pathSegments[pathSegments.length - 1];
      const actionMap = {
        get: 'get',
        post: 'create',
        put: 'update',
        delete: 'delete',
        patch: 'patch'
      };
      const action = actionMap[method.toLowerCase()] || method.toLowerCase();
      const resource = lastSegment.replace(/[{}]/g, '').replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
      baseName = toPascalCase(`${action}${resource.charAt(0).toUpperCase() + resource.slice(1)}`);
    }
    return `${baseName}_${method.toUpperCase()}`;
  }

  public getTypeName(data: APIDataType) {
    const typeName = this.config?.hook?.customTypeName?.(data) || this.getFuncationName(data);
    return toPascalCase(`${typeName ?? data.operationId}Params`);
  }

  public getServiceTP() {
    return Object.keys(this.apiData)
      .map((tag) => {
        // functionName tag 级别防重
        const tmpFunctionRD: Record<string, number> = {};
        const genParams = this.apiData[tag]
          .filter(
            (api) =>
              // 暂不支持变量
              !api.path.includes('${'),
          )
          .map((api) => {
            const newApi = api;
            try {
              const allParams = this.getParamsTP(newApi.parameters, newApi.path);
              const body = this.getBodyTP(newApi.requestBody);
              const response = this.getResponseTP(newApi.responses);

              // let { file, ...params } = allParams || {}; // I dont't know if 'file' is valid parameter, maybe it's safe to remove it
              // const newfile = this.getFileTP(newApi.requestBody);
              // file = this.concatOrNull(file, newfile);
              const params = allParams || {};
              const file = this.getFileTP(newApi.requestBody);

              let formData = false;
              if ((body && (body.mediaType || '').includes('form')) || file) {
                formData = true;
              }

              let functionName = this.getFuncationName(newApi);

              if (functionName && tmpFunctionRD[functionName]) {
                functionName = `${functionName}_${(tmpFunctionRD[functionName] += 1)}`;
              } else if (functionName) {
                tmpFunctionRD[functionName] = 1;
              }

              let formattedPath = newApi.path.replace(
                /:([^/]*)|{([^}]*)}/gi,
                (_, str, str2) => `$\{${str || str2}}`,
              );
              if (newApi.extensions && newApi.extensions['x-antTech-description']) {
                const { extensions } = newApi;
                const { apiName, antTechVersion, productCode, antTechApiName } = extensions[
                  'x-antTech-description'
                ];
                formattedPath = antTechApiName || formattedPath;
                this.mappings.push({
                  antTechApi: formattedPath,
                  popAction: apiName,
                  popProduct: productCode,
                  antTechVersion,
                });
                newApi.antTechVersion = antTechVersion;
              }

              // 为 path 中的 params 添加 alias
              const escapedPathParams = ((params || {}).path || []).map((ele, index) => ({
                ...ele,
                alias: `param${index}`,
              }));
              if (escapedPathParams.length) {
                escapedPathParams.forEach((param) => {
                  formattedPath = formattedPath.replace(`$\{${param.name}}`, `$\{${param.alias}}`);
                });
              }

              const finalParams =
                escapedPathParams && escapedPathParams.length
                  ? { ...params, path: escapedPathParams }
                  : params;

              // 处理 query 中的复杂对象
              // const arrayParams = {};
              if (finalParams && finalParams.query) {
                finalParams.query = finalParams.query.map((ele) => {
                  // if (ele.name.includes('[0].')) {
                  //   const [name, field] = ele.name.split('[0].');

                  //   if (!arrayParams[name]) {
                  //     arrayParams[name] = {
                  //       name: name,
                  //       in: 'query',
                  //       description: '',
                  //       required: false,
                  //       schema: {
                  //         "$ref": `#/components/schemas/${field.replace('s', '')}`,
                  //         type: 'array'
                  //       },
                  //       isObject: true,
                  //       type: 'array'
                  //     }
                  //   }
                  // }

                  return {
                    ...ele,
                    isComplexType: ele.isObject,
                  };
                });
              }

              const getPrefixPath = () => {
                if (!this.config.apiPrefix) {
                  return formattedPath;
                }
                // 静态 apiPrefix
                const prefix =
                  typeof this.config.apiPrefix === 'function'
                    ? `${this.config.apiPrefix({
                      path: formattedPath,
                      method: newApi.method,
                      namespace: tag,
                      functionName,
                    })}`.trim()
                    : this.config.apiPrefix.trim();

                if (!prefix) {
                  return formattedPath;
                }

                if (prefix.startsWith("'") || prefix.startsWith('"') || prefix.startsWith('`')) {
                  const finalPrefix = prefix.slice(1, prefix.length - 1);
                  if (
                    formattedPath.startsWith(finalPrefix) ||
                    formattedPath.startsWith(`/${finalPrefix}`)
                  ) {
                    return formattedPath;
                  }
                  return `${finalPrefix}${formattedPath}`;
                }
                // prefix 变量
                return `$\{${prefix}}${formattedPath}`;
              };

              // 直接分析参数结构判断 service 方法参数类型
              const pathParams = Array.isArray(finalParams.path) ? finalParams.path : [];
              const queryParams = (finalParams && typeof finalParams === 'object' && 'query' in finalParams && Array.isArray(finalParams.query)) ? finalParams.query : [];
              const hasBody = !!body;
              const hasFile = !!file;
              const onlySinglePathParam =
                pathParams.length === 1 &&
                queryParams.length === 0 &&
                !hasBody &&
                !hasFile;

              // 新增：只有 path+body（无 query、无 file，且 path 数量为1）
              const onlyPathAndBody =
                pathParams.length === 1 &&
                queryParams.length === 0 &&
                hasBody &&
                !hasFile;

              // 处理 path 变量替换，支持多个 path 参数
              let finalPath = getPrefixPath();
              if (pathParams.length > 0) {
                pathParams.forEach((p, idx) => {
                  finalPath = finalPath.replace(new RegExp(`\\$\\{param${idx}\\}`, 'g'), `\u0000${p.name}\u0001`);
                });
                // 再统一替换为 ${name}
                finalPath = finalPath.replace(/\u0000([^\u0001]+)\u0001/g, '${$1}');
              }

              // 注释 pathInComment 也同步替换
              let finalPathInComment = formattedPath.replace(/\*/g, '&#42;');
              if (pathParams.length > 0) {
                pathParams.forEach((p, idx) => {
                  finalPathInComment = finalPathInComment.replace(new RegExp(`\\$\\{param${idx}\\}`, 'g'), `\u0000${p.name}\u0001`);
                });
                finalPathInComment = finalPathInComment.replace(/\u0000([^\u0001]+)\u0001/g, '${$1}');
              }

              // 参数分支集中判断（修正健壮性）
              let paramMode = 'params';
              let pathParamNames = pathParams.map(p => p.name);
              let bodyType = 'any';
              if (body) {
                if ('propertiesList' in body && body.propertiesList) {
                  bodyType = `Models.${body.type}`;
                } else if ('type' in body && body.type) {
                  bodyType = body.type;
                }
              }

              if (pathParams.length === 1 && queryParams.length === 0 && !hasFile && !hasBody) {
                paramMode = 'id';
              } else if (pathParams.length === 1 && queryParams.length === 0 && !hasFile && hasBody) {
                paramMode = 'id+body';
              } else {
                paramMode = 'params';
              }

              return {
                ...newApi,
                functionName,
                typeName: this.getTypeName(newApi),
                path: finalPath,
                pathInComment: finalPathInComment,
                hasPathVariables: formattedPath.includes('{'),
                hasApiPrefix: !!this.config.apiPrefix,
                method: newApi.method,
                desc: newApi.summary || newApi.description || newApi.operationId,
                params: finalParams,
                hasParams: !!finalParams && Object.keys(finalParams).length > 0,
                body,
                file,
                response,
                onlyPathParam: onlySinglePathParam,
                onlyPathAndBody,
                pathParamName: onlySinglePathParam || onlyPathAndBody ? pathParams[0].name : undefined,
                hasFormData: !!file,
                hasHeader: !!body || !!file,
                paramMode,
                pathParamNames,
                bodyType,
              };
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error('[GenSDK] gen service param error:', error);
              throw error;
            }
          })
          // 排序下，要不每次git都乱了
          .sort((a, b) => a.path.localeCompare(b.path));

        const fileName = this.replaceDot(tag);

        let className = fileName;
        if (this.config.hook && this.config.hook.customClassName) {
          className = this.config.hook.customClassName(tag);
        }
        if (genParams.length) {
          this.classNameList.push({
            fileName: className,
            controllerName: className,
          });
        }
        return {
          genType: 'ts',
          className,
          instanceName: `${fileName[0].toLowerCase()}${fileName.substr(1)}`,
          list: genParams,
        };
      })
      .filter((ele) => !!ele.list.length);
  }

  public getBodyTP(requestBody: any = {}) {
    const reqBody: RequestBodyObject = this.resolveRefObject(requestBody);
    if (!reqBody) {
      return null;
    }
    const reqContent: ContentObject = reqBody.content;
    if (typeof reqContent !== 'object') {
      return null;
    }
    let mediaType = Object.keys(reqContent)[0];

    const schema: SchemaObject = reqContent[mediaType].schema || DEFAULT_SCHEMA;

    if (mediaType === '*/*') {
      mediaType = '';
    }
    // 如果 requestBody 有 required 属性，则正常展示；如果没有，默认非必填
    const required = typeof requestBody.required === 'boolean' ? requestBody.required : false;
    if (schema.type === 'object' && schema.properties) {
      const propertiesList = Object.keys(schema.properties)
        .map((p) => {
          if (
            schema.properties &&
            schema.properties[p] &&
            !['binary', 'base64'].includes((schema.properties[p] as SchemaObject).format || '') &&
            !(
              ['string[]', 'array'].includes((schema.properties[p] as SchemaObject).type || '') &&
              ['binary', 'base64'].includes(
                ((schema.properties[p] as SchemaObject).items as SchemaObject).format || '',
              )
            )
          ) {
            return {
              key: p,
              schema: {
                ...schema.properties[p],
                type: getType(schema.properties[p]),
                required: schema.required?.includes(p) ?? false,
              },
            };
          }
          return undefined;
        })
        .filter((p) => p);
      return {
        mediaType,
        ...schema,
        required,
        propertiesList,
      };
    }
    return {
      mediaType,
      required,
      type: getType(schema),
    };
  }

  public getFileTP(requestBody: any = {}) {
    const reqBody: RequestBodyObject = this.resolveRefObject(requestBody);
    if (reqBody && reqBody.content && reqBody.content['multipart/form-data']) {
      const ret = this.resolveFileTP(reqBody.content['multipart/form-data'].schema);
      return ret.length > 0 ? ret : null;
    }
    return null;
  }

  public resolveFileTP(obj: any) {
    let ret = [];
    const resolved = this.resolveObject(obj);
    const props =
      (resolved.props &&
        resolved.props.length > 0 &&
        resolved.props[0].filter(
          (p) =>
            p.format === 'binary' ||
            p.format === 'base64' ||
            ((p.type === 'string[]' || p.type === 'array') &&
              (p.items.format === 'binary' || p.items.format === 'base64')),
        )) ||
      [];
    if (props.length > 0) {
      ret = props.map((p) => {
        return { title: p.name, multiple: p.type === 'string[]' || p.type === 'array' };
      });
    }
    if (resolved.type) ret = [...ret, ...this.resolveFileTP(resolved.type)];
    return ret;
  }

  public getResponseTP(responses: ResponsesObject = {}) {
    const { components } = this.openAPIData;
    const response: ResponseObject | undefined =
      responses && this.resolveRefObject(responses.default || responses['200'] || responses['201']);
    const defaultResponse = {
      mediaType: '*/*',
      type: 'any',
    };
    if (!response) {
      return defaultResponse;
    }
    const resContent: ContentObject | undefined = response.content;
    const mediaType = Object.keys(resContent || {})[0];
    if (typeof resContent !== 'object' || !mediaType) {
      return defaultResponse;
    }
    let schema = (resContent[mediaType].schema || DEFAULT_SCHEMA) as SchemaObject;

    if (schema.$ref) {
      // const refWithEncodedChars = schema.$ref.replace('%C2%AB', '<').replace('%C2%BB', '>');
      // schema.$ref = refWithEncodedChars

      const refPaths = schema.$ref.split('/');
      const refName = refPaths[refPaths.length - 1];
      const childrenSchema = components.schemas[refName] as SchemaObject;
      if (
        childrenSchema?.type === 'object' &&
        'properties' in childrenSchema &&
        this.config.dataFields
      ) {
        schema =
          this.config.dataFields
            .map((field) => childrenSchema.properties[field])
            .filter(Boolean)?.[0] ||
          resContent[mediaType].schema ||
          DEFAULT_SCHEMA;
      }
    }

    if ('properties' in schema) {
      Object.keys(schema.properties).map((fieldName) => {
        // eslint-disable-next-line @typescript-eslint/dot-notation
        schema.properties[fieldName]['required'] = schema.required?.includes(fieldName) ?? false;
      });
    }

    return {
      mediaType,
      type: getType(schema),
    };
  }

  public getParamsTP(
    parameters: (ParameterObject | ReferenceObject)[] = [],
    path: string = null,
  ): Record<string, ParameterObject[]> {
    const templateParams: Record<string, ParameterObject[]> = {};

    if (parameters && parameters.length) {
      ['query', 'path', 'cookie' /* , 'file' */].forEach((source) => {
        // Possible values are "query", "header", "path" or "cookie". (https://swagger.io/specification/)
        const params = parameters
          .map((p) => this.resolveRefObject(p))
          .filter((p: ParameterObject) => p.in === source)
          .map((p) => {
            const isDirectObject = ((p.schema || {}).type || p.type) === 'object';
            const refList = ((p.schema || {}).$ref || p.$ref || '').split('/');
            const ref = refList[refList.length - 1];
            const deRefObj = (Object.entries(
              (this.openAPIData.components && this.openAPIData.components.schemas) || {},
            ).find(([k]) => k === ref) || []) as any;
            const isRefObject = (deRefObj[1] || {}).type === 'object';
            return {
              ...p,
              isObject: isDirectObject || isRefObject,
              type: getType(p.schema || DEFAULT_SCHEMA),
            };
          });

        if (params.length) {
          templateParams[source] = params;
        }
      });
    }

    if (path && path.length > 0) {
      const regex = /\{(\w+)\}/g;
      templateParams.path = templateParams.path || [];
      let match = null;
      while ((match = regex.exec(path))) {
        if (!templateParams.path.some((p) => p.name === match[1])) {
          templateParams.path.push({
            ...DEFAULT_PATH_PARAM,
            name: match[1],
          });
        }
      }

      // 如果 path 没有内容，则将删除 path 参数，避免影响后续的 hasParams 判断
      if (!templateParams.path.length) delete templateParams.path;
    }

    return templateParams;
  }

  public getModelTP() {
    const { components } = this.openAPIData;

    const data =
      components &&
      [components.schemas].map((defines) => {
        if (!defines) {
          return null;
        }

        return Object.keys(defines).map((typeName) => {
          const result = this.resolveObject(defines[typeName]);

          result?.props?.forEach((e) => {
            e.forEach((item) => {
              item?.type?.includes('[]') && (item['isArray'] = true);
              item['isArray'] = false;
            });
          });

          const getDefinesType = () => {
            if (result.type) {
              return (defines[typeName] as SchemaObject).type === 'object' || result.type;
            }
            return 'Record<string, unknown>';
          };

          /** 
           * 修改泛型命名 <T>
           * @type {*}
           *  */
          const inputString = resolveTypeName(typeName);
          const regex = /«(.+?)»/g;
          const matches = inputString.match(regex);

          const contentTArray = [];

          if (matches) {
            for (const match of matches) {
              const content = match.match(/«(.+?)»/)[1];
              contentTArray.push(content);
            }
          }

          const props = result.props || [];

          props.forEach((prop) => {
            prop.forEach((item) => {
              contentTArray.forEach((content) => {
                if ((item?.type as string).includes(content)) {
                  item.type = (item?.type as string).replace(content, 'T');
                }
              });
            });
          });

          // 主 schema 生成部分过滤
          if (shouldSkipSinglePathParamClass(props)) return null;

          return {
            typeName: toPascalCase(resolveTypeName(typeName).replace(/«.+»/g, '<T>')),
            type: getDefinesType(),
            parent: result.parent,
            props: result.props || [],
            isEnum: result?.isEnum,
          };
        });
      });

    // 强行替换掉请求参数params的类型，生成方法对应的 xxxxParams 类型
    Object.keys(this.openAPIData.paths || {}).forEach((p) => {
      const pathItem: PathItemObject = this.openAPIData.paths[p];
      ['get', 'put', 'post', 'delete', 'patch'].forEach((method) => {
        const operationObject: OperationObject = pathItem[method];
        if (!operationObject) {
          return;
        }
        operationObject.parameters = operationObject.parameters?.filter(
          (item) => (item as ParameterObject)?.in !== 'header',
        );
        const props = [];

        if (operationObject.parameters) {
          const comxArrayParams = {};
          operationObject.parameters.forEach((parameter: any) => {
            // TODO: 这些是特殊处理 可能不通用
            if (parameter.name.includes('[0]')) {
              const [name, field] = parameter.name.split('[0]');

              if (!comxArrayParams[name]) {
                function convertToCamelCase(input: string): string {
                  // 使用正则表达式将单词分开
                  const words = input.split(/(?=[A-Z])/);

                  // 将所有单词的首字母大写
                  const camelCaseWords = words.map(
                    (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
                  );

                  // 如果最后一个单词是 'List'，则去掉它
                  if (camelCaseWords[camelCaseWords.length - 1] === 'List') {
                    camelCaseWords.pop();
                  }

                  // 将单词重新组合成字符串
                  const camelCaseString = camelCaseWords.join('');

                  return camelCaseString;
                }

                const camelCaseResult = convertToCamelCase(name);

                comxArrayParams[name] = {
                  desc: '',
                  name: name,
                  required: false,
                  type: `Array<${camelCaseResult}>`,
                  initialValue: '[]',
                };
              }
            } else {
              const pType = getType(parameter.schema, false);

              props.push({
                desc: parameter.description ?? '',
                name: parameter.name,
                required: parameter.required,
                type: pType,
                initialValue: getInitialValue(pType, parameter.required, parameter.schema),
              });
            }
          });

          for (const key in comxArrayParams) {
            props.push(comxArrayParams[key]);
          }
        }
        // parameters may be in path
        if (pathItem.parameters) {
          pathItem.parameters.forEach((parameter: any) => {
            props.push({
              desc: parameter.description ?? '',
              name: parameter.name,
              required: parameter.required,
              type: getType(parameter.schema, false),
            });
          });
        }

        // 判断 props 是否只包含 path 参数，且数量为1
        const onlyPathParam =
          props.length === 1 &&
          props[0].length === 1 &&
          (operationObject.parameters || []).every((p: any) => p.in === 'path') &&
          !pathItem.parameters &&
          !operationObject.requestBody;

        // params 替换部分过滤
        if (props.length > 0 && data && !shouldSkipSinglePathParamClass([props])) {
          data.push([
            {
              typeName: this.getTypeName({ ...operationObject, method, path: p }),
              type: 'Record<string, unknown>',
              parent: undefined,
              props: [props],
              isEnum: false,
            },
          ]);
        }
      });
    });
    // ---- 生成 xxxparams 类型 end---------

    return (
      data &&
      data
        .reduce((p, c) => p && c && p.concat(c), [])
        .filter(Boolean)
        // 排序下，要不每次git都乱了
        .sort((a, b) => a.typeName.localeCompare(b.typeName))
    );
  }

  private genFileFromTemplate(
    fileName: string,
    type: TypescriptFileType,
    params: Record<string, any>,
  ): boolean {
    try {
      const template = this.getTemplate(type);

      // 设置输出不转义
      nunjucks.configure({
        autoescape: false,
      });

      return writeFile(this.finalPath, fileName, nunjucks.renderString(template, params));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[GenSDK] file gen fail:', fileName, 'type:', type);
      throw error;
    }
  }

  private getTemplate(type: TypescriptFileType): string {
    return readFileSync(join(this.config.templatesFolder, `${type}.njk`), 'utf8');
  }

  // 获取 TS 类型的属性列表
  getProps(schemaObject: SchemaObject) {
    const requiredPropKeys = schemaObject?.required ?? false;
    return schemaObject.properties
      ? Object.keys(schemaObject.properties).map((propName) => {
        const schema: SchemaObject =
          (schemaObject.properties && schemaObject.properties[propName]) || DEFAULT_SCHEMA;

        const isEnum = 'enum' in schema;

        const sType = getType(schema, false);

        const required = requiredPropKeys
          ? requiredPropKeys.some((key) => key === propName)
          : false;
        return {
          ...schema,
          name: propName,
          type: sType,
          desc: [schema.title, schema.description].filter((s) => s).join(' '),
          // 如果没有 required 信息，默认全部是非必填
          required: required,
          initialValue: !required && isEnum ? 'undefined' : (isEnum ? schema.type === 'string' ? JSON.stringify(schema.enum[0]) : schema.enum[0] : getInitialValue(sType, required, schema)),
          // 新增 unionDefault 字段
          unionDefault: /^".*"(\s*\|\s*".*")+$/.test(sType)
            ? (sType.match(/"([^"]+)"/) ? sType.match(/"([^"]+)"/)[1] : undefined)
            : undefined,
        };
      })
      : [];
  }

  resolveObject(schemaObject: SchemaObject) {
    // 引用类型
    if (schemaObject.$ref) {
      return this.resolveRefObject(schemaObject);
    }
    // 枚举类型
    if (schemaObject.enum) {
      return this.resolveEnumObject(schemaObject);
    }
    // 继承类型
    if (schemaObject.allOf && schemaObject.allOf.length) {
      return this.resolveAllOfObject(schemaObject);
    }
    // 对象类型
    if (schemaObject.properties) {
      return this.resolveProperties(schemaObject);
    }
    // 数组类型
    if (schemaObject.items && schemaObject.type === 'array') {
      return this.resolveArray(schemaObject);
    }
    return schemaObject;
  }

  resolveArray(schemaObject: SchemaObject) {
    if (schemaObject.items.$ref) {
      const refObj = schemaObject.items.$ref.split('/');
      return {
        type: `${refObj[refObj.length - 1]}[]`,
      };
    }
    // TODO: 这里需要解析出具体属性，但由于 parser 层还不确定，所以暂时先返回 any
    return 'any[]';
  }

  resolveProperties(schemaObject: SchemaObject) {
    return {
      props: [this.getProps(schemaObject)],
    };
  }

  resolveEnumObject(schemaObject: SchemaObject) {

    if (schemaObject?.enum) {
      const enumObject = schemaObject.enum.reduce((pre, cur) => {
        pre[cur] ? pre : pre[cur] = cur;
        return pre;
      }, {});


      return {
        isEnum: true,
        type: JSON.stringify(enumObject).replace(/:/g, '='),
      };
    }

    const enumArray = schemaObject.enum;

    let enumStr;
    switch (this.config.enumStyle) {
      case 'enum':
        enumStr = `{${enumArray.map((v) => `${v}="${v}"`).join(',')}}`;
        break;
      case 'string-literal':
        enumStr = Array.from(
          new Set(
            enumArray.map((v) =>
              typeof v === 'string' ? `"${v.replace(/"/g, '"')}"` : getType(v, false),
            ),
          ),
        ).join(' | ');
        break;
      default:
        break;
    }

    return {
      isEnum: this.config.enumStyle == 'enum',
      type: Array.isArray(enumArray) ? enumStr : 'string',
    };
  }

  resolveAllOfObject(schemaObject: SchemaObject) {
    const props = (schemaObject.allOf || []).map((item) =>
      item.$ref ? [{ ...item, type: getType(item, false).split('/').pop() }] : this.getProps(item),
    );

    if (schemaObject.properties) {
      const extProps = this.getProps(schemaObject);
      return { props: [...props, extProps] };
    }

    return { props };
  }

  // 将地址path路径转为大驼峰
  private genDefaultFunctionName(path: string, pathBasePrefix: string) {
    // 首字母转大写
    function toUpperFirstLetter(text: string) {
      return text.charAt(0).toUpperCase() + text.slice(1);
    }

    // const pathItems = path.split('/')

    // const funName = toUpperFirstLetter(pathItems[pathItems.length - 1])

    // return funName;

    return path
      ?.replace(pathBasePrefix, '')
      .split('/')
      .map((str) => {
        /**
         * 兼容错误命名如 /user/:id/:name
         * 因为是typeName，所以直接进行转换
         * */
        let s = resolveTypeName(str);
        if (s.includes('-')) {
          s = s.replace(/(-\w)+/g, (_match: string, p1) => p1?.slice(1).toUpperCase());
        }

        if (s.match(/^{.+}$/gim)) {
          return `By${toUpperFirstLetter(s.slice(1, s.length - 1))}`;
        }
        return toUpperFirstLetter(s);
      })
      .join('');
  }
  // 检测所有path重复区域（prefix）
  private getBasePrefix(paths: string[]) {
    const arr = [];
    paths
      .map((item) => item.split('/'))
      .forEach((pathItem) => {
        pathItem.forEach((item, key) => {
          if (arr.length <= key) {
            arr[key] = [];
          }
          arr[key].push(item);
        });
      });

    const res = [];
    arr
      .map((item) => Array.from(new Set(item)))
      .every((item) => {
        const b = item.length === 1;
        if (b) {
          res.push(item);
        }
        return b;
      });

    return `${res.join('/')}/`;
  }

  private resolveRefObject(refObject: any): any {
    if (!refObject || !refObject.$ref) {
      return refObject;
    }
    const refPaths = refObject.$ref.split('/');
    if (refPaths[0] === '#') {
      refPaths.shift();
      let obj: any = this.openAPIData;
      refPaths.forEach((node: any) => {
        obj = obj[node];
      });
      if (!obj) {
        throw new Error(`[GenSDK] Data Error! Notfoud: ${refObject.$ref}`);
      }
      return {
        ...this.resolveRefObject(obj),
        type: obj.$ref ? this.resolveRefObject(obj).type : obj,
      };
    }
    return refObject;
  }

  private getFinalFileName(s: string): string {
    // 支持下划线、中划线和空格分隔符，注意分隔符枚举值的顺序不能改变，否则正则匹配会报错
    return s.replace(/[-_ ](\w)/g, (_all, letter) => letter.toUpperCase());
  }

  private replaceDot(s: string) {
    return s.replace(/\./g, '_').replace(/[-_ ](\w)/g, (_all, letter) => letter.toUpperCase());
  }

  private resolveFunctionName(functionName: string, methodName) {
    // 类型声明过滤关键字
    if (ReservedDict.check(functionName)) {
      return `${functionName}Using${methodName.toUpperCase()}`;
    }
    return functionName;
  }
}

export { ServiceGenerator };
