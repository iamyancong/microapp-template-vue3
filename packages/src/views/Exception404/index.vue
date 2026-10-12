<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Result } from 'ant-design-vue';
import { YButton } from '@yss-ui/components';

defineOptions({ name: 'Exception404' });

const route = useRoute();
const router = useRouter();

/** 当前未匹配的子应用路由。 */
const missingPath = computed(() => route.fullPath);

/** 返回当前微应用首页。 */
const goHome = async (): Promise<void> => {
  await router.replace('/');
};
</script>

<template>
  <Result status="404" title="404" :sub-title="$t('exception.notFoundSubTitle', { path: missingPath })">
    <template #extra>
      <YButton type="primary" @click="goHome">{{ $t('exception.backHome') }}</YButton>
    </template>
  </Result>
</template>
