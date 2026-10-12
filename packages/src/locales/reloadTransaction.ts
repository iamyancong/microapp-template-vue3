/** 重载切换的副作用接口，便于验证取消、写入失败与执行顺序。 */
export interface ReloadTransactionOptions<L> {
  confirm: (locale: L) => Promise<boolean>;
  prepare: (locale: L) => Promise<unknown>;
  persist: (locale: L) => () => void;
  show: (locale: L) => void;
  beforeReload: () => Promise<void>;
  reload: () => void;
  cancel: () => void;
}

/** 确认和资源准备完成前不改偏好；当前页面继续使用旧有效语言，直到整个文档重载。 */
export const createReloadTransaction = <L>(options: ReloadTransactionOptions<L>) => {
  let pending = false;
  return async (locale: L): Promise<boolean> => {
    if (pending) return false;
    pending = true;
    let rollback: (() => void) | undefined;
    try {
      if (!(await options.confirm(locale))) return false;
      await options.prepare(locale);
      options.show(locale);
      rollback = options.persist(locale);
      await options.beforeReload();
      options.reload();
      return true;
    } catch (error) {
      try {
        rollback?.();
      } finally {
        options.cancel();
      }
      throw error;
    } finally {
      pending = false;
    }
  };
};
