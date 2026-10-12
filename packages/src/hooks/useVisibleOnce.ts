import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';

/** 元素接近可视区域时只激活一次；支持内部滚动容器，卸载后释放观察器。 */
export const useVisibleOnce = (target: Ref<HTMLElement | undefined>) => {
  const visible = ref(false);
  let observer: IntersectionObserver | undefined;
  onMounted(() => {
    if (!target.value || typeof IntersectionObserver === 'undefined') {
      visible.value = true;
      return;
    }
    observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          visible.value = true;
          observer?.disconnect();
        }
      },
      { rootMargin: '160px' }
    );
    observer.observe(target.value);
  });
  onBeforeUnmount(() => observer?.disconnect());
  return visible;
};
