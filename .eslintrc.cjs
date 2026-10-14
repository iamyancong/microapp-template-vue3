module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    '@vue/eslint-config-typescript',
    '@vue/eslint-config-prettier',
    'plugin:vue/vue3-recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['vue', '@typescript-eslint', 'import'],
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './packages/tsconfig.json',
      },
      alias: {
        map: [
          ['@', './packages/src'],
        ],
        extensions: ['.ts', '.tsx', '.vue', '.js', '.jsx'],
      },
    },
    'import/extensions': ['.js', '.jsx', '.ts', '.tsx', '.vue'],
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
      'vue-eslint-parser': ['.vue'],
    },
  },
  rules: {
    // ========== 错误级别（必须修复） ==========
    
    // 禁止未使用的变量
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    
    // 禁止 console.log（生产环境）
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    
    // 强制使用 === 和 !==
    'eqeqeq': ['error', 'always'],
    
    // 禁止空代码块，但允许空的 catch 块
    'no-empty': ['error', { allowEmptyCatch: true }],
    
    // Import 路径检查
    'import/no-unresolved': 'error', // 禁止导入不存在的模块
    'import/no-absolute-path': 'error', // 禁止绝对路径导入
    'import/no-self-import': 'error', // 禁止自己导入自己
    'import/no-cycle': 'error', // 禁止循环依赖
    'import/no-useless-path-segments': 'error', // 禁止无用的路径片段

    // Agent 工程硬约束：限制不规范模块与组件导入 (物理拦截代替 Prompt)
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'ant-design-vue',
            importNames: ['Table'],
            message: '禁止直接使用 a-table。业务列表与表格请统一使用 @yss-ui/components 的 YTable。',
          },
          {
            name: '@formily/antdv',
            message: '禁止直接导入 @formily/antdv。业务表单请统一使用 @yss-ui/components 的 YFormily + JSON Schema。',
          },
        ],
      },
    ],

    // Agent 工程硬约束：禁止绕过统一请求封装直接调用 fetch
    'no-restricted-globals': [
      'error',
      {
        name: 'fetch',
        message: '请使用统一 API / mutator 请求封装，禁止直接使用原生 fetch。',
      },
    ],

    // 禁止未使用的导入
    'no-unused-vars': 'off', // 关闭基础规则，使用 TypeScript 版本
    
    // Vue 相关错误级别规则
    'vue/multi-word-component-names': 'error',
    'vue/no-unused-components': 'error',
    'vue/no-unused-vars': 'error',
    'vue/require-v-for-key': 'error',
    'vue/require-prop-types': 'error',
    'vue/valid-v-slot': 'error',
    
    // TypeScript 相关错误级别规则
    '@typescript-eslint/no-unused-expressions': 'error',
    'prefer-const': 'error',
    
    // ========== 警告级别（建议修复） ==========
    
    // 非空断言警告
    '@typescript-eslint/no-non-null-assertion': 'warn',
    
    // 变量定义但未使用（警告）
    'no-undef': 'warn',
    
    // 空函数警告
    '@typescript-eslint/no-empty-function': 'warn',
    
    // Vue 相关警告
    'vue/no-v-html': 'warn',
    'vue/require-default-prop': 'warn',
    
    // ========== 已放宽的规则 ==========
    
    // 允许 any 类型
    '@typescript-eslint/no-explicit-any': 'off',
    
    // 不强制函数返回类型注解
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    
    // 不强制缩进格式（交给 Prettier 处理）
    'indent': 'off',
    '@typescript-eslint/indent': 'off',
    
    // 不强制引号格式（交给 Prettier 处理）
    'quotes': 'off',
    '@typescript-eslint/quotes': 'off',
    
    // 不强制分号规则（交给 Prettier 处理）
    'semi': 'off',
    '@typescript-eslint/semi': 'off',
    
    // 允许空的接口
    '@typescript-eslint/no-empty-interface': 'off',
    
    // 允许 require
    '@typescript-eslint/no-var-requires': 'off',
    
    // Import 相关放宽规则
    'import/default': 'off', // Vue 组件的默认导出检查
    'import/no-named-as-default': 'warn', // 降级为警告
    'import/namespace': 'off', // 命名空间导入检查
    
    // Vue 相关放宽规则
    'vue/singleline-html-element-content-newline': 'off',
    'vue/multiline-html-element-content-newline': 'off',
    'vue/html-self-closing': 'off',
    'vue/max-attributes-per-line': 'off',
  },
  ignorePatterns: [
    // 构建输出目录
    'packages/dist/',
    'dist/',
    'build/',
    '*.min.js',
    '*.min.css',
    
    // 依赖包
    'node_modules/',
    
    // API 自动生成的文件
    'packages/src/api/generated/',
    'packages/src/api/index.ts',
    'packages/src/api/mutator.ts',
    
    // 配置文件
    '*.config.js',
    '*.config.ts',
    '.eslintrc.cjs',
    '.prettierrc.cjs',
    '.commitlintrc.cjs',
    '.lintstagedrc.cjs',
  ],
  overrides: [
    {
      // 对 .vue 文件的特殊配置
      files: ['*.vue'],
      rules: {
        // Vue 文件中允许单词组件名（页面组件）
        'vue/multi-word-component-names': 'off',
      },
    },
    {
      // 对测试文件的特殊配置
      files: ['**/__tests__/**/*', '**/*.{test,spec}.{js,ts,jsx,tsx}'],
      rules: {
        // 测试文件中允许 console.log
        'no-console': 'off',
        // 测试文件中允许 any 类型
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      // 对开发环境文件的特殊配置
      files: ['*.dev.{js,ts}', '*.development.{js,ts}'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
