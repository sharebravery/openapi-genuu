export function sanitizeContent(content: string): string {
    return content
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

export function sanitizeSchema(schema: any): any {
    if (typeof schema === 'string') {
        return sanitizeContent(schema);
    }

    if (Array.isArray(schema)) {
        return schema.map(sanitizeSchema);
    }

    if (typeof schema === 'object' && schema !== null) {
        const result = {};
        for (const key in schema) {
            result[key] = sanitizeSchema(schema[key]);
        }
        return result;
    }

    return schema;
}
