/**
 * Orval API 转换器
 *
 * 该脚本在代码生成之前修改 OpenAPI 规范。
 * 它专门针对包含 `application/x-www-form-urlencoded` 请求体的接口操作，
 * 如果这些请求体的 schema 为空（即没有定义任何属性），
 * 则会删除整个 requestBody 部分，从而避免生成无用的函数参数。
 *
 * @param {Object} schema - 解析后的 OpenAPI 规范对象
 * @returns {Object} - 处理后的 OpenAPI 规范对象
 */
module.exports = (schema) => {
  const paths = schema.paths || {};
  const operations = [];

  Object.keys(paths).forEach((path) => {
    const methods = paths[path];
    Object.keys(methods).forEach((method) => {
      const operation = methods[method];
      if (!operation || typeof operation !== 'object') {
        return;
      }

      operations.push({ path, method, operation });

      // 检查操作是否包含 requestBody
      if (operation.requestBody && operation.requestBody.content) {
        const content = operation.requestBody.content;

        // 检查是否为 x-www-form-urlencoded 类型
        if (content['application/x-www-form-urlencoded']) {
          const mediaType = content['application/x-www-form-urlencoded'];

          // 检查 schema 是否为空（类型为 object，但无任何属性定义）
          if (
            mediaType.schema &&
            mediaType.schema.type === 'object' &&
            (!mediaType.schema.properties || Object.keys(mediaType.schema.properties).length === 0)
          ) {
            console.log(`[Transformer] 移除空 requestBody: ${method.toUpperCase()} ${path}`);
            delete operation.requestBody;
          }
        }
      }
    });
  });

  const duplicateOperationIds = new Map();
  operations.forEach(({ path, method, operation }) => {
    if (!operation.operationId) {
      return;
    }

    const normalizedId = String(operation.operationId).toLowerCase();
    if (!duplicateOperationIds.has(normalizedId)) {
      duplicateOperationIds.set(normalizedId, []);
    }

    duplicateOperationIds.get(normalizedId).push({ path, method, operation });
  });

  duplicateOperationIds.forEach((group) => {
    if (group.length <= 1) {
      return;
    }

    // 保留更符合现有命名习惯的 lowerCamelCase，其余冲突项追加路径后缀。
    group.sort((a, b) => {
      const aStartsLower = /^[a-z]/.test(a.operation.operationId || '') ? 0 : 1;
      const bStartsLower = /^[a-z]/.test(b.operation.operationId || '') ? 0 : 1;
      if (aStartsLower !== bStartsLower) {
        return aStartsLower - bStartsLower;
      }

      const aKey = `${a.method}:${a.path}`;
      const bKey = `${b.method}:${b.path}`;
      return aKey.localeCompare(bKey);
    });

    group.slice(1).forEach(({ path, method, operation }) => {
      const originalOperationId = String(operation.operationId);
      const pathSuffix = path
        .split('/')
        .filter(Boolean)
        .map((segment) => segment.replace(/[{}]/g, ''))
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join('');
      const uniqueOperationId = `${originalOperationId}By${pathSuffix}`;

      console.log(
        `[Transformer] 重命名重复 operationId: ${originalOperationId} -> ${uniqueOperationId} (${method.toUpperCase()} ${path})`
      );
      operation.operationId = uniqueOperationId;
    });
  });

  return schema;
};
