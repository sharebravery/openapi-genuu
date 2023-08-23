const assert = require('assert');
const path = require('path');
const fs = require('fs');

const openAPI = require('../dist/index');

const gen = async () => {
  await openAPI.generateService({
    requestLibPath: "import request  from '@/request';",
    schemaPath: `${__dirname}/example-files/swagger-custom-hook.json`,
    serversPath: './servers',
    hook: {
      // 自定义类名
      customClassName: (tagName) => {
        return /[A-Z].+/.exec(tagName);
      },
      // 自定义函数名
      customFunctionName: (data) => {
        let funName = data.operationId ? data.operationId : '';
        const suffix = 'Using';
        if (funName.indexOf(suffix) != -1) {
          funName = funName.substring(0, funName.lastIndexOf(suffix));
        }
        return funName;
      },
      // 自定义类型名
      customTypeName: (data) => {
        const { operationId } = data;
        const funName = operationId ? operationId[0].toUpperCase() + operationId.substring(1) : '';
        const tag = data?.tags?.[0];

        return `${tag ? tag : ''}${funName}`;
      },
    },
  });
};
gen();
