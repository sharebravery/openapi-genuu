const path = require('path');
const openAPI = require('../dist/index');

const testBuild = async () => {
    try {
        // 测试本地 swagger 文件生成
        await openAPI.generateService({
            schemaPath: path.join(__dirname, 'test-allof-api.json'),
            serversPath: './generated-test/servers-allof',
        });

        // 测试在线 swagger 文件生成
        await openAPI.generateService({
            schemaPath: 'http://localhost:8010/swagger/doc.json',
            serversPath: './generated-test/orka-new',
            strictTypes: true,
            allResponseFieldsRequired: true
        });

        console.log('✅ 打包后代码测试成功！');
    } catch (error) {
        console.error('❌ 打包后代码测试失败：', error);
        process.exit(1);
    }
};

testBuild();
