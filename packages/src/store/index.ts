import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useMicroStore = defineStore('micro', () => {
  // 状态
  const count = ref(0);
  const user = ref({
    id: 0,
    name: '',
    email: '',
  });
  const loading = ref(false);
  const theme = ref('light');

  // 计算属性
  const doubleCount = computed(() => count.value * 2);
  const isLoggedIn = computed(() => user.value.id > 0);
  const isDarkTheme = computed(() => theme.value === 'dark');

  // 方法
  const increment = () => {
    count.value++;
  };

  const decrement = () => {
    count.value--;
  };

  const setUser = (userData: { id: number; name: string; email: string }) => {
    user.value = { ...userData };
  };

  const clearUser = () => {
    user.value = {
      id: 0,
      name: '',
      email: '',
    };
  };

  const setLoading = (status: boolean) => {
    loading.value = status;
  };

  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light';
  };

  return {
    // 状态
    count,
    user,
    loading,
    theme,
    // 计算属性
    doubleCount,
    isLoggedIn,
    isDarkTheme,
    // 方法
    increment,
    decrement,
    setUser,
    clearUser,
    setLoading,
    toggleTheme,
  };
});
