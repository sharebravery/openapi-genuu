const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
    // 确保目标目录存在
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    // 读取源目录中的所有文件和文件夹
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            // 如果是目录，递归复制
            copyDir(srcPath, destPath);
        } else {
            // 如果是文件，直接复制并保持内容不变
            const content = fs.readFileSync(srcPath, 'utf-8');
            fs.writeFileSync(destPath, content, 'utf-8');
        }
    }
}

// 源模板目录和目标目录
const templatesDir = path.join(__dirname, '../templates');
const templatesDist = path.join(__dirname, '../dist/templates');

// 复制模板目录到 dist 目录，保持内容不变
copyDir(templatesDir, templatesDist);

console.log('✅ 模板文件已成功复制到 dist/templates');