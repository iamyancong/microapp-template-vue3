import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createChunkReloadKey,
  isChunkLoadError,
  reserveChunkReload,
  resolveMicroAppEventPath,
  resolveMicroAppFullPath,
} from '../microAppRouterBridge.ts';

test('只解析属于当前 activeRule 的完整路由', () => {
  assert.equal(
    resolveMicroAppFullPath('/subApp/outsourced/', {
      pathname: '/subApp/outsourced/rulesMaintain/analyticRule',
      search: '?mode=edit',
      hash: '#detail',
    }),
    '/rulesMaintain/analyticRule?mode=edit#detail'
  );
  assert.equal(
    resolveMicroAppFullPath('/subApp/outsourced', {
      pathname: '/subApp/outsourced-other/page',
      search: '',
      hash: '',
    }),
    null
  );
});

test('主应用同步事件保留 query 和 hash', () => {
  assert.equal(
    resolveMicroAppEventPath(
      '/subApp/outsourced',
      '/subApp/outsourced/information/management?page=2#table',
      'http://localhost:32088'
    ),
    '/information/management?page=2#table'
  );
});

test('识别旧 chunk、动态导入和错误 MIME 类型', () => {
  assert.equal(isChunkLoadError(new Error('Failed to fetch dynamically imported module: /assets/page-old.js')), true);
  assert.equal(
    isChunkLoadError(
      new Error(
        'Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html".'
      )
    ),
    true
  );
  assert.equal(isChunkLoadError(new Error('接口请求失败')), false);
});

test('同一应用同一路由只预留一次自动刷新机会', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
  const key = createChunkReloadKey('outsourced', '/rulesMaintain/analyticRule');

  assert.equal(reserveChunkReload(storage, key), true);
  assert.equal(reserveChunkReload(storage, key), false);
});
