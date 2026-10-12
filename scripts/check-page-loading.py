"""使用独立 Chrome 上下文检查首屏与滚动后的资源，默认拦截 API，避免依赖后端或修改数据。"""
import argparse
import json
import re
import sys
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--url', default='http://localhost:8081/table')
parser.add_argument('--timeout-ms', type=int, default=60000)
parser.add_argument('--selector', default='.vxe-table--render-default')
parser.add_argument('--scroll', action='store_true')
parser.add_argument('--assert-dev-isolation', action='store_true')
parser.add_argument('--max-mb', type=float)
parser.add_argument('--max-requests', type=int)
args = parser.parse_args()

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.add_init_script('performance.setResourceTimingBufferSize(10000)')
    # 排除第三方头像等外部资源的网络波动；业务与构建资源均从目标本地服务读取。
    page.route(re.compile(r'^https://'), lambda route: route.abort())
    target = urlsplit(args.url)
    origin = f'{target.scheme}://{target.netloc}'
    page.route(re.compile(r'^' + re.escape(origin) + r'/api/'), lambda route: route.fulfill(
        status=200, content_type='application/json',
        body=json.dumps({'success': True, 'data': [], 'totalCount': 0})))
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(args.url, wait_until='domcontentloaded', timeout=args.timeout_ms)
    try:
        page.wait_for_selector(args.selector, state='attached', timeout=args.timeout_ms)
    except Exception:
        print(json.dumps({'errors': errors, 'body': page.locator('body').inner_text()[:1500]}, ensure_ascii=False))
        raise
    page.wait_for_load_state('networkidle', timeout=30000)

    def snapshot():
        rows = page.evaluate('''performance.getEntriesByType('resource').map(x => ({
          url:x.name, bytes:x.decodedBodySize, transferred:x.transferSize
        }))''')
        return {
            'requests': len(rows),
            'MB': round(sum(row['bytes'] for row in rows) / 1e6, 3),
            'rawEchartsRequests': sum('/echarts/' in row['url'] for row in rows),
            'rawYssModules': [row for row in rows if 'main-exports' in row['url'] and '.mjs' in row['url']],
            'canvases': page.locator('canvas').count(),
            'largest': sorted(rows, key=lambda row: row['bytes'], reverse=True)[:6],
        }

    result = {'url': args.url, 'initial': snapshot()}
    print(json.dumps(result, ensure_ascii=False), file=sys.stderr, flush=True)
    if args.scroll:
        page.locator('.custom-app-slot-wrapper').scroll_into_view_if_needed()
        try:
            page.wait_for_function("Array.from(document.querySelectorAll('canvas')).some(canvas => canvas.width > 0 && canvas.height > 0)", timeout=args.timeout_ms)
        except Exception:
            print(json.dumps({'errors': errors, 'body': page.locator('body').inner_text()[-2500:], 'snapshot': snapshot()}, ensure_ascii=False))
            raise
        page.wait_for_load_state('networkidle', timeout=30000)
        result['afterScroll'] = snapshot()
    result['errors'] = errors
    if args.assert_dev_isolation:
        verify_exports = '''async () => {
          const entries = performance.getEntriesByType('resource');
          const rootUrl = entries.find(x => (x.name.includes('/@yss-ui_components.js') || x.name.includes('/@yss-ui_components_modular_light.js')))?.name;
          const localeUrl = entries.find(x => x.name.includes('/@yss-ui_components_locale.js'))?.name;
          if (!rootUrl && entries.some(x => x.name.includes('@yss-ui_components_entries_'))) {
            const names = ['YTree', 'YTable', 'YConfigProvider', 'useLocale', 'setGlobalLocale', 'formatTemplate'];
            const modules = await Promise.all(names.map(name => import('/@id/@yss-ui/components/entries/' + name)));
            const locale = await import(localeUrl || '/@id/@yss-ui/components/locale');
            return { mode: 'official', missing: names.filter((name, i) => !modules[i][name]), sharedLocale: modules[3].useLocale === locale.useLocale };
          }
          if (!rootUrl || !localeUrl) throw new Error('缺少公开入口或语言入口');
          const ui = await import(rootUrl);
          const locale = await import(localeUrl);
          const names = ['YTree', 'YTable', 'YConfigProvider', 'useLocale', 'setGlobalLocale', 'formatTemplate'];
          return { missing: names.filter(name => !ui[name]), sharedLocale: ui.useLocale === locale.useLocale };
        }'''
        for attempt in range(3):
            try:
                result['exports'] = page.evaluate(verify_exports)
                break
            except Exception as error:
                if 'Execution context was destroyed' not in str(error) or attempt == 2:
                    raise
                page.wait_for_selector(args.selector, timeout=args.timeout_ms)
                page.wait_for_load_state('networkidle')

    print(json.dumps(result, ensure_ascii=False, indent=2))
    browser.close()
    if errors:
        raise SystemExit('页面存在运行时错误')
    if args.assert_dev_isolation and (result['exports']['missing'] or not result['exports']['sharedLocale']):
        raise SystemExit('公开导出或语言单例兼容性回归')
    final = result.get('afterScroll', result['initial'])
    if args.assert_dev_isolation and (final['rawEchartsRequests'] or final['rawYssModules']):
        raise SystemExit('依赖隔离回归：浏览器仍请求原始 YSS/ECharts 模块')
    if args.max_mb is not None and final['MB'] > args.max_mb:
        raise SystemExit('页面资源超过体积预算')
    if args.max_requests is not None and final['requests'] > args.max_requests:
        raise SystemExit('页面请求数超过预算')
