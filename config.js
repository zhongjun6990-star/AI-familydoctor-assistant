/**
 * 大模型 API 配置
 * 后期对接真实大模型时，只需修改这个文件即可，业务代码无需改动。
 */

module.exports = {
  // 接口地址（兼容 OpenAI 格式 /chat/completions 的服务都可用，
  // 例如 DeepSeek、通义千问、月之暗面 Kimi、智谱 GLM、OpenAI 等）
  apiBaseUrl: 'https://your-api-endpoint.com',

  // 请求路径
  chatPath: '/v1/chat/completions',

  // API Key（建议后期放到小程序后端，不要在客户端明文暴露）
  apiKey: 'YOUR_API_KEY',

  // 模型名称，例如 deepseek-chat / qwen-plus / gpt-4o / moonshot-v1-8k
  model: 'deepseek-chat',

  // 是否使用流式输出（打字机效果）
  stream: false,

  // 系统提示词（角色设定）
  systemPrompt: '你是钟老板的 AI 助手，专注新媒体运营，回答简洁高效、直击要点。'
};
