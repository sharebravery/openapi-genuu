const path = require('path');
const fs = require('fs');
const openAPI = require('../dist/index');

// 检查模板文件是否正确
function checkTemplateContent() {
    console.log('📝 检查模板文件...');

    // 检查原始模板
    const originalTemplateDir = path.join(__dirname, '../templates');
    const originalTemplates = {};
    fs.readdirSync(originalTemplateDir).forEach(file => {
        const content = fs.readFileSync(path.join(originalTemplateDir, file), 'utf-8');
        originalTemplates[file] = content;
    });

    // 检查 dist 中的模板
    const distTemplateDir = path.join(__dirname, '../dist/templates');
    const distTemplates = {};
    fs.readdirSync(distTemplateDir).forEach(file => {
        const content = fs.readFileSync(path.join(distTemplateDir, file), 'utf-8');
        distTemplates[file] = content;
    });

    // 比较内容
    for (const file in originalTemplates) {
        if (originalTemplates[file] !== distTemplates[file]) {
            console.error(`❌ 模板文件 ${file} 内容不匹配`);
            console.log('原始内容:', originalTemplates[file]);
            console.log('dist 内容:', distTemplates[file]);
            throw new Error('模板文件内容不匹配');
        }
    }
    console.log('✅ 模板文件检查通过');
}

const testBuild = async () => {
    try {
        // 1. 首先检查模板文件
        checkTemplateContent();

        // 2. 测试本地 swagger 文件生成
        console.log('📝 测试本地 swagger 文件生成...');
        await openAPI.generateService({
            schemaPath: path.join(__dirname, 'test-allof-api.json'),
            serversPath: './generated-test/servers-allof',
        });

        // 检查生成的文件内容
        const checkGeneratedFile = (filePath) => {
            console.log(`检查文件: ${filePath}`);
            const content = fs.readFileSync(filePath, 'utf-8');
            if (content.includes('&#39;')) {
                console.error('❌ 发现 HTML 实体 &#39;');
                throw new Error(`文件 ${filePath} 包含 HTML 实体`);
            }
        };

        // 3. 测试在线 swagger 文件生成
        console.log('📝 测试在线 swagger 文件生成...');
        await openAPI.generateService({
            schemaPath: 'http://172.16.1.139:8010/swagger/doc.json',
            serversPath: './generated-test/orka-new',
            strictTypes: true,
            allResponseFieldsRequired: true
        });

        // 4. 检查生成的文件
        console.log('📝 检查生成的文件...');
        const generatedDir = './generated-test/orka-new';
        function checkDirectory(dir) {
            fs.readdirSync(dir, { withFileTypes: true }).forEach(dirent => {
                const fullPath = path.join(dir, dirent.name);
                if (dirent.isDirectory()) {
                    checkDirectory(fullPath);
                } else if (dirent.name.endsWith('.ts')) {
                    checkGeneratedFile(fullPath);
                }
            });
        }
        checkDirectory(generatedDir);

        console.log('✅ 打包后代码测试全部通过！');
    } catch (error) {
        console.error('❌ 打包后代码测试失败：', error);
        process.exit(1);
    }
};

testBuild();
