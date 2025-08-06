const fs = require('fs');
const path = require('path');

// 确保 dist/templates 目录存在
const templatesDist = path.join(__dirname, '../dist/templates');
if (!fs.existsSync(templatesDist)) {
  fs.mkdirSync(templatesDist, { recursive: true });
}

// 复制模板文件到 dist 目录
const templatesDir = path.join(__dirname, '../templates');
fs.readdirSync(templatesDir).forEach(file => {
  const content = fs.readFileSync(path.join(templatesDir, file), 'utf-8');
  // 确保模板内容不被转义
  fs.writeFileSync(
    path.join(templatesDist, file),
    content,
    'utf-8'
  );
});

// 修改 package.json 中的路径
const packageJson = require('../package.json');
packageJson.files = ['dist'];
fs.writeFileSync(
  path.join(__dirname, '../package.json'),
  JSON.stringify(packageJson, null, 2),
  'utf-8'
);
