const assert = require('assert');
const path = require('path');
const fs = require('fs');

const openAPI = require('../dist/index');

const gen = async () => {
  // await openAPI.generateService({
  //   schemaPath: `http://192.168.1.6:8889/user/v2/api-docs`,
  //   serversPath: './.generated-exchange',
  // });
  // await openAPI.generateService({
  //   schemaPath: `http://localhost:8889/user/v2/api-docs`,
  //   serversPath: './.generated',
  // });

  await openAPI.generateService({
    schemaPath: `${__dirname}/test-allof-api.json`,
    serversPath: './servers-allof',
  });

  await openAPI.generateService({
    schemaPath: `${__dirname}/example-files/swagger-get-method-params-convert-obj.json`,
    serversPath: './servers',
  });

  await openAPI.generateService({
    schemaPath: `http://localhost:8010/swagger/doc.json`,
    serversPath: './generated/orka',
  });


  // await openAPI.generateService({
  //   schemaPath: `http://127.0.0.1:4523/export/openapi?projectId=3481564&version=3.0`,
  //   serversPath: './.generated-follow',
  //   // enumStyle: 'enum'
  // });

  // await openAPI.generateService({
  //   schemaPath: `${__dirname}/example-files/exchange-core.openapi.json`,
  //   serversPath: './.generated-exchange',
  // });

  // await openAPI.generateService({
  //   schemaPath: `${__dirname}/example-files/swagger-get-method-params-convert-obj.json`,
  //   serversPath: './servers',
  // });

  // await openAPI.generateService({
  //   schemaPath: `${__dirname}/example-files/swagger-schema-contain-blank-symbol.json`,
  //   serversPath: './servers/blank-symbol-servers',
  //   enumStyle: 'enum',
  // });

  // await openAPI.generateService({
  //   schemaPath: `${__dirname}/example-files/swagger-file-convert.json`,
  //   serversPath: './file-servers',
  //   enumStyle: 'enum',
  // });

  // await openAPI.generateService({
  //   requestLibPath: "import request  from '@/request';",
  //   schemaPath: `${__dirname}/example-files/swagger-custom-hook.json`,
  //   serversPath: './servers',
  //   hook: {
  //     // 自定义类名
  //     customClassName: (tagName) => {
  //       return /[A-Z].+/.exec(tagName);
  //     },
  //     // 自定义函数名
  //     customFunctionName: (data) => {
  //       let funName = data.operationId ? data.operationId : '';
  //       const suffix = 'Using';
  //       if (funName.indexOf(suffix) != -1) {
  //         funName = funName.substring(0, funName.lastIndexOf(suffix));
  //       }
  //       return funName;
  //     },
  //     // 自定义类型名
  //     customTypeName: (data) => {
  //       const { operationId } = data;
  //       const funName = operationId ? operationId[0].toUpperCase() + operationId.substring(1) : '';
  //       const tag = data?.tags?.[0];

  //       return `${tag ? tag : ''}${funName}`;
  //     },
  //   },
  // });

  // // 支持null类型作为默认值
  // await openAPI.generateService({
  //   schemaPath: `${__dirname}/example-files/swagger-get-method-params-convert-obj.json`,
  //   serversPath: './servers/support-null',
  //   nullable: true,
  //   enumStyle: 'enum',
  // });

  // await openAPI.generateService({
  //   // requestLibPath: "import request  from '@/request';",
  //   schemaPath: `http://82.157.33.9/swagger/swagger.json`,
  //   serversPath: './servers',
  // });
  // await openAPI.generateService({
  //   schemaPath: 'https://gw.alipayobjects.com/os/antfincdn/CA1dOm%2631B/openapi.json',
  //   serversPath: './servers',
  //   mockFolder: './mocks',
  // });
  // await openAPI.generateService({
  //   schemaPath: 'http://petstore.swagger.io/v2/swagger.json',
  //   serversPath: './servers',
  //   mockFolder: './mocks',
  // });
  // await openAPI.generateService({
  //   schemaPath: 'https://gw.alipayobjects.com/os/antfincdn/LyDMjDyIhK/1611471979478-opa.json',
  //   serversPath: './servers',
  //   mockFolder: './mocks',
  // });
  // await openAPI.generateService({
  //   schemaPath: 'https://gw.alipayobjects.com/os/antfincdn/Zd7dLTHUjE/ant-design-pro.json',
  //   serversPath: './servers',
  //   mockFolder: './mocks',
  // });
  // await openAPI.generateService({
  //   schemaPath: `${__dirname}/morse-api.json`,
  //   serversPath: './servers',
  //   mockFolder: './mocks',
  // });
  // await openAPI.generateService({
  //   schemaPath: `${__dirname}/oc-swagger.json`,
  //   serversPath: './servers',
  //   mockFolder: './mocks',
  // });
  // await openAPI.generateService({
  //   schemaPath: `${__dirname}/java-api.json`,
  //   serversPath: './servers',
  //   mockFolder: './mocks',
  // });
};
gen();
