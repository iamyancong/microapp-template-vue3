module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 类型枚举
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新功能
        'fix',      // 修复
        'docs',     // 文档
        'style',    // 格式（不影响代码运行的变动）
        'refactor', // 重构（即不是新增功能，也不是修改bug的代码变动）
        'perf',     // 性能优化
        'test',     // 增加测试
        'chore',    // 构建过程或辅助工具的变动
        'revert',   // 回滚
        'build',    // 打包
        'ci',       // 持续集成
      ],
    ],

    // 主题长度限制
    'subject-max-length': [2, 'always', 100],
    'subject-min-length': [2, 'always', 4],

    // 主题格式
    'subject-case': [
      2,
      'never',
      ['sentence-case', 'start-case', 'pascal-case', 'upper-case'],
    ],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],

    // 类型格式
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],

    // 作用域
    'scope-case': [2, 'always', 'lower-case'],

    // 正文和页脚
    'body-leading-blank': [1, 'always'],
    'footer-leading-blank': [1, 'always'],

    // 头部格式
    'header-max-length': [2, 'always', 100],
  },

  // 自定义解析器（支持中文）
  parserPreset: {
    parserOpts: {
      headerPattern: /^(\w*)(?:\(([^)]*)\))?: (.*)$/,
      headerCorrespondence: ['type', 'scope', 'subject'],
    },
  },

  // 忽略提交类型（如合并提交）
  ignores: [(commit) => commit.includes('Merge')],

  // 自定义提示信息
  prompt: {
    messages: {
      type: '选择你要提交的类型 :',
      scope: '选择一个提交范围（可选）:',
      customScope: '请输入自定义的提交范围 :',
      subject: '填写简短精炼的变更描述 :\n',
      body: '填写更加详细的变更描述（可选）。使用 "|" 换行 :\n',
      breaking: '列举非兼容性重大的变更（可选）。使用 "|" 换行 :\n',
      footerPrefixsSelect: '选择关联issue前缀（可选）:',
      customFooterPrefixs: '输入自定义issue前缀 :',
      footer: '列举关联issue (可选) 例如: #31, #I3244 :\n',
      confirmCommit: '是否提交或修改commit ?',
    },
    types: [
      { value: 'feat', name: 'feat:     新功能', emoji: '✨' },
      { value: 'fix', name: 'fix:      修复', emoji: '🐛' },
      { value: 'docs', name: 'docs:     文档变更', emoji: '📚' },
      { value: 'style', name: 'style:    代码格式（不影响功能，例如空格、分号等格式修正）', emoji: '💎' },
      { value: 'refactor', name: 'refactor: 代码重构（不包括 bug 修复、功能新增）', emoji: '📦' },
      { value: 'perf', name: 'perf:     性能优化', emoji: '🚀' },
      { value: 'test', name: 'test:     添加、修改测试用例', emoji: '🚨' },
      { value: 'build', name: 'build:    构建流程、外部依赖变更（如升级 npm 包、修改 webpack 配置等）', emoji: '🛠' },
      { value: 'ci', name: 'ci:       修改 CI 配置、脚本', emoji: '⚙️' },
      { value: 'chore', name: 'chore:    对构建过程或辅助工具和库的更改（不影响源文件、测试用例）', emoji: '♻️' },
      { value: 'revert', name: 'revert:   回滚 commit', emoji: '🗑' },
    ],
    useEmoji: false,
    emojiAlign: 'center',
    themeColorCode: '',
    scopes: [
      // 一级目录 Scope
      'views',       // 页面视图
      'api',         // API 接口层
      'components',  // 公共组件
      'hooks',       // 自定义 Hooks
      'utils',       // 工具函数
      'styles',      // 全局样式
      'store',       // 状态管理
      'router',      // 路由配置
      'config',      // 项目配置
      'layout',      // 布局组件
      'plugins',     // 插件配置
      'types',       // 类型定义
      // 其他 Scope
      'deps',        // 依赖更新
      'ci',          // CI/CD 配置
      'auth',        // 认证相关
      'other',       // 其他
    ],
    allowCustomScopes: true,
    allowEmptyScopes: true,
    customScopesAlign: 'bottom',
    customScopesAlias: 'custom',
    emptyScopesAlias: 'empty',
    upperCaseSubject: false,
    markBreakingChangeMode: false,
    allowBreakingChanges: ['feat', 'fix'],
    breaklineNumber: 100,
    breaklineChar: '|',
    skipQuestions: [],
    issuePrefixs: [
      { value: 'closed', name: 'closed:   ISSUES has been processed' },
    ],
    customIssuePrefixsAlign: 'top',
    emptyIssuePrefixsAlias: 'skip',
    customIssuePrefixsAlias: 'custom',
    allowCustomIssuePrefixs: true,
    allowEmptyIssuePrefixs: true,
    confirmColorize: true,
    maxHeaderLength: Infinity,
    maxSubjectLength: Infinity,
    minSubjectLength: 0,
    scopeOverrides: undefined,
    defaultBody: '',
    defaultIssues: '',
    defaultScope: '',
    defaultSubject: '',
  },
};
