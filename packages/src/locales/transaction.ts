/** 资源准备和状态提交分离；prepare 必须无可见状态副作用，commit 必须同步完成。 */
export interface LocaleTransactionOptions<L, R> {
  prepare: (locale: L) => Promise<R>;
  commit: (locale: L, resource: R) => void;
}

/** 最后请求生效的事务控制器；过期失败不覆盖新请求，卸载会使在途结果失效。 */
export const createLocaleTransaction = <L, R>(options: LocaleTransactionOptions<L, R>) => {
  let revision = 0;
  return {
    async set(locale: L): Promise<boolean> {
      const request = ++revision;
      try {
        const resource = await options.prepare(locale);
        if (request !== revision) return false;
        options.commit(locale, resource);
        return true;
      } catch (error) {
        if (request !== revision) return false;
        throw error;
      }
    },
    cancel(): void {
      revision += 1;
    },
  };
};
