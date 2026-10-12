import type { YTableColumn, YTableActionConfig } from '@yss-ui/components';

/**
 * 创建响应式 Formily Schema。
 * @param t 国际化翻译函数
 */
export const createSchema = (t: (key: string, values?: Record<string, any>) => string) => ({
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'horizontal', labelWidth: 90 },
      properties: {
        grid: {
          type: 'void',
          'x-component': 'FormGrid',
          properties: {
            userType: {
              type: 'string',
              title: t('demo.userType'),
              'x-decorator': 'FormItem',
              'x-component': 'Radio.Group',
              enum: [
                { label: t('demo.personal'), value: 'personal' },
                { label: t('demo.company'), value: 'company' },
              ],
              'x-decorator-props': { gridSpan: 1 },
            },
            name: {
              type: 'string',
              title: t('demo.name'),
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-visible': "{{ $values.userType === 'personal' }}",
              'x-decorator-props': { gridSpan: 2 },
            },
            companyName: {
              type: 'string',
              title: t('demo.companyName'),
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-visible': "{{ $values.userType === 'company' }}",
              'x-decorator-props': { gridSpan: 2 },
            },
            age: {
              type: 'number',
              title: t('demo.age'),
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-disabled': '{{ $values.status === false }}',
              'x-decorator-props': { gridSpan: 1 },
            },
            status: {
              type: 'boolean',
              title: t('demo.status'),
              'x-decorator': 'FormItem',
              'x-component': 'Switch',
              'x-decorator-props': { gridSpan: 1 },
            },
            actions: {
              type: 'void',
              'x-decorator': 'FormItem',
              'x-decorator-props': { gridSpan: 1, colon: false },
              'x-component': 'AutoButtonGroup',
              properties: {
                submit: { type: 'void', 'x-component': 'Submit', 'x-content': t('demo.query') },
                reset: { type: 'void', 'x-component': 'Reset', 'x-content': t('demo.reset') },
              },
            },
          },
        },
      },
    },
  },
});

/**
 * 创建表格列配置。
 * @param t 国际化翻译函数
 */
export const createColumns = (t: (key: string, values?: Record<string, any>) => string): YTableColumn[] => [
  { type: 'seq' as const, title: t('demo.seq'), width: 60, align: 'center' as const },
  { field: 'name', title: t('demo.name'), width: 120 },
  { field: 'age', title: t('demo.age'), width: 80, align: 'center' as const },
  {
    field: 'gender',
    title: t('demo.gender'),
    width: 80,
    align: 'center' as const,
    formatter: ({ cellValue }) =>
      cellValue === 'male' ? t('demo.male') : cellValue === 'female' ? t('demo.female') : String(cellValue ?? ''),
  },
];

/**
 * 创建操作列配置。
 * @param handlers 按钮事件处理回调
 * @param t 国际化翻译函数
 */
export const createActionConfig = (
  handlers: {
    onView: (row: any) => void;
    onHide: (row: any) => void;
    onDelete: (row: any, hideLoading: () => void, close: () => void) => Promise<void>;
  },
  t: (key: string, values?: Record<string, any>) => string
): YTableActionConfig => ({
  title: t('common.operation'),
  width: 180,
  align: 'left',
  fixed: 'right',
  displayLimit: 2,
  moreRenderType: 'moreButton',
  moreText: t('common.more'),
  buttons: [
    {
      text: t('demo.actions.view'),
      key: 'view',
      type: 'link',
      clickFn: ({ row }: any) => handlers.onView(row),
      disabledFn: ({ rowIndex }: any) => rowIndex % 2 === 0,
    },
    {
      text: t('demo.actions.edit'),
      key: 'hide',
      type: 'text',
      hideFn: ({ rowIndex }: any) => rowIndex % 2 === 0,
      clickFn: ({ row }: any) => handlers.onHide(row),
    },
    {
      text: t('demo.actions.delete'),
      key: 'delete',
      type: 'text',
      isConfirm: true,
      confirmProps: { title: t('demo.actions.confirmDelete'), needLoading: true },
      clickFn: async ({ row }: any, _btn: any, { hideLoading, close }: any) => {
        await handlers.onDelete(row, hideLoading, close);
      },
    },
  ],
});
