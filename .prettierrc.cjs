module.exports = {
  // 基础格式化配置
  semi: true,                          // 行尾分号
  singleQuote: true,                   // 单引号
  quoteProps: 'as-needed',             // 对象属性引号：仅在需要时添加
  trailingComma: 'es5',                // 尾随逗号：ES5 兼容
  bracketSpacing: true,                // 对象括号空格
  bracketSameLine: false,              // 标签结束括号换行
  arrowParens: 'avoid',                // 箭头函数参数括号：单参数时省略
  
  // 代码宽度和缩进
  printWidth: 120,                     // 行宽限制
  tabWidth: 2,                         // 缩进宽度
  useTabs: false,                      // 使用空格而非制表符
  
  // 换行符配置
  endOfLine: 'lf',                     // 统一使用 LF 换行符
  
  // HTML 相关配置
  htmlWhitespaceSensitivity: 'css',    // HTML 空格敏感度
  
  // Vue 文件特殊配置
  vueIndentScriptAndStyle: false,      // Vue 文件中 script 和 style 不额外缩进
  
  // 嵌入语言格式化
  embeddedLanguageFormatting: 'auto',  // 自动格式化嵌入的语言
  
  // 文件类型特定配置
  overrides: [
    {
      files: '*.vue',
      options: {
        parser: 'vue',
        // Vue 单文件组件特殊配置
        singleAttributePerLine: false,   // 单个属性不强制换行
      },
    },
    {
      files: ['*.json', '*.jsonc'],
      options: {
        parser: 'json',
        trailingComma: 'none',          // JSON 文件不使用尾随逗号
      },
    },
    {
      files: '*.md',
      options: {
        parser: 'markdown',
        printWidth: 80,                 // Markdown 文件较短行宽
        proseWrap: 'preserve',          // 保持原有换行
      },
    },
    {
      files: ['*.yml', '*.yaml'],
      options: {
        parser: 'yaml',
        singleQuote: false,            // YAML 使用双引号
      },
    },
    {
      files: '*.less',
      options: {
        parser: 'less',
        singleQuote: false,            // Less 文件使用双引号
      },
    },
    {
      files: '*.scss',
      options: {
        parser: 'scss',
        singleQuote: false,            // SCSS 文件使用双引号
      },
    },
  ],
};
