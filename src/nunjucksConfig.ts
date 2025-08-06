const nunjucks = require('nunjucks');

// 创建一个新的 nunjucks 环境
const env = new nunjucks.Environment(null, {
    autoescape: false,
    trimBlocks: true,
    lstripBlocks: true
});

// 添加一个自定义过滤器来处理字符串
env.addFilter('cleanHtmlEntities', function (str) {
    if (typeof str !== 'string') return str;
    return str.replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
});

module.exports = env;
