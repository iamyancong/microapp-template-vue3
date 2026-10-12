<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { message } from 'ant-design-vue';
import { YCard, YFormily, YTable } from '@yss-ui/components';
import { useTableHeight } from '@yss-ui/hooks';
import { createSchema, createColumns, createActionConfig } from './constant';

defineOptions({ name: 'TableDemo' });

const { t } = useI18n();

/** 初始值保持引用稳定，语言切换不会重建表单。 */
const initialValues = { userType: 'personal', status: true };

const schema = computed(() => createSchema(t));
const columns = computed(() => createColumns(t));

const pageState = ref({ current: 1, pageSize: 5 });
const pagination = computed({
  get: () => ({
    ...pageState.value,
    total: tableData.value.length,
    showSizeChanger: true,
    showTotal: (total: number) => t('common.total', { total }),
  }),
  set: val => {
    pageState.value = { ...pageState.value, ...val };
  },
});

const tableData = ref([
  { _X_ROW_KEY: '1', name: '张三', age: 28, gender: 'male', isAudt: false },
  { _X_ROW_KEY: '2', name: '李四', age: 22, gender: 'male', isAudt: true },
  { _X_ROW_KEY: '3', name: '王五', age: 26, gender: 'female', isAudt: false },
  { _X_ROW_KEY: '4', name: '赵六', age: 30, gender: 'male', isAudt: false },
]);

const tableRef = ref();
const { tableHeight } = useTableHeight(tableRef, { withPagination: true });

const handleView = (row: any) => {
  message.info(t('demo.actions.viewDetail', { name: row.name }));
};

const handleHide = (row: any) => {
  message.info(t('demo.actions.hideDetail', { name: row.name }));
};

const handleDelete = async (row: any, hideLoading: () => void, close: () => void) => {
  await new Promise(r => setTimeout(r, 600));
  const idx = tableData.value.findIndex(i => i._X_ROW_KEY === row._X_ROW_KEY);
  if (idx > -1) tableData.value.splice(idx, 1);
  hideLoading();
  close();
  message.success(t('demo.actions.deleteSuccess'));
};

const actionConfig = computed(() =>
  createActionConfig(
    {
      onView: handleView,
      onHide: handleHide,
      onDelete: handleDelete,
    },
    t
  )
);
</script>

<template>
  <YCard class="demo-container">
    <YFormily ref="formRef" :schema="schema" :initial-values="initialValues" />
    <div ref="tableRef" class="table-container-demo">
      <YTable
        v-model:pagination="pagination"
        :data="tableData"
        :columns="columns"
        :pageable="true"
        :max-height="tableHeight"
        :action-config="actionConfig"
        :show-action-column="true"
      />
    </div>
  </YCard>
</template>

<style scoped lang="less">
@import './style.less';
</style>
