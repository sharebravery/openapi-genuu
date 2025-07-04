import { generateService } from './src';

// 基本配置示例
generateService({
    schemaPath: './swagger.json',
    serversPath: './generated/api',
    projectName: 'api',
    namespace: 'API',
    requestImportStatement: "import { request } from 'umi';",

    // 启用严格类型模式
    strictTypes: true,

    // 使用 interface 而不是 class（除了参数类型）
    useInterface: true,

    // 自定义响应包装器
    responseWrapper: 'ApiResponse',

    // 自定义钩子函数
    hook: {
        // 自定义函数名生成
        customFunctionName: (data) => {
            const { operationId, summary, method, path } = data;

            // 优先使用 operationId
            if (operationId) {
                return operationId
                    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
                    .replace(/^[A-Z]/, (c) => c.toLowerCase());
            }

            // 使用 summary
            if (summary) {
                return summary
                    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
                    .replace(/^[A-Z]/, (c) => c.toLowerCase());
            }

            // 从路径生成
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

            return `${action}${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
        },

        // 自定义类型名生成
        customTypeName: (data) => {
            const { operationId, method, path } = data;

            if (operationId) {
                return `${operationId.replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))}Params`;
            }

            // 从路径和方法生成
            const pathSegments = path.split('/').filter(Boolean);
            const lastSegment = pathSegments[pathSegments.length - 1];
            const resource = lastSegment.replace(/[{}]/g, '').replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));

            return `${resource.charAt(0).toUpperCase() + resource.slice(1)}${method.charAt(0).toUpperCase() + method.slice(1).toLowerCase()}Params`;
        },

        // 自定义类名生成
        customClassName: (tagName) => {
            return `${tagName.charAt(0).toUpperCase() + tagName.slice(1)}Service`;
        },
    },

    // 枚举样式
    enumStyle: 'string-literal',

    // 响应数据字段
    dataFields: ['result', 'data', 'res'],

    // 使用 null 代替可选
    nullable: false,
}); 