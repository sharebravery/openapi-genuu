import type { ApiType } from 'swagger-generator-api';
import { defineConfig } from 'swagger-generator-api';
import { DefaultApisTransform, defaultModelTransformFn } from 'swagger-generator-api/lib/presets';

const baseUrl = 'http://127.0.0.1:4523';

export default defineConfig({
    version: 'v3',
    apiDocs: [
        {
            url: `${baseUrl}/export/openapi?projectId=3481564&version=3.1`,
            basePath: '.generated',
            template: {
                models: {
                    transform: defaultModelTransformFn,
                    dts: true,
                },
                api: {
                    output: (fileId: string) => {
                        // 演示使用函数自定义api输出目录
                        return fileId.replace('apis', 'requests')
                    },
                    transform: (apis: ApiType, fileId: string) => {
                        const generated = new DefaultApisTransform();
                        generated.getApiOptions = () => {
                            return `export class apiOptions {
                static async request<TData, TResult>(
                  options: AxiosRequestConfig<TData>
                ): Promise<TResult> {
                  return axios.request<TData, AxiosResponse<TResult>>(options) as TResult;
                }

                static async callPackedApiAsync<TData, TResult>(
                  options: AxiosRequestConfig<TData>
                ): Promise<TResult> {
                  const result = (await apiOptions.request<TData, AxiosResponse<TResult>>(options)) as unknown as PackedApiResult<TResult>;
                  if (!result.success) {
                    throw new Error("请求接口错误");
                  }
                  return result.data!;
                }
              }`
                        }
                        generated.getReturnType = (action) => {
                            if (typeof action.returnType === 'string' && action.returnType?.includes('PackedApiResult'))
                                return action.returnType?.replace(/^PackedApiResult<(.*)>$/g, '$1')
                            return action.returnType
                        }
                        generated.getApiRequestName = (action) => {
                            if (typeof action.returnType === 'string' && action.returnType.includes('PackedApiResult')) return 'apiOptions.callPackedApiAsync'
                            return 'apiOptions.request'
                        }
                        return {
                            code: generated.generated(apis),
                            output: fileId,
                        }
                    },
                },
                onAfterWriteFile: (models, apis) => {
                    // 这里可以做一些生成后的操作，
                },
            },
        },
    ],
})
