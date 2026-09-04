/**
 * 大模型 API 封装
 * 说明：正式上线时，建议把请求放到你自己的后端服务器上转发，
 * 避免在小程序客户端明文暴露 apiKey，也方便统一管理。
 */

const config = require('../config');

/**
 * 发送聊天消息（非流式）
 * @param {Array}  messages  消息数组 [{ role: 'user' | 'assistant', content: string }]
 * @returns {Promise<string>} 助手回复文本
 */
function sendChatMessage(messages) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: config.apiBaseUrl + config.chatPath,
      method: 'POST',
      timeout: 60000,
      header: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + config.apiKey
      },
      data: {
        model: config.model,
        messages: [
          { role: 'system', content: config.systemPrompt },
          ...messages
        ],
        stream: false
      },
      success(res) {
        if (res.statusCode === 200) {
          const text =
            res.data &&
            res.data.choices &&
            res.data.choices[0] &&
            res.data.choices[0].message &&
            res.data.choices[0].message.content;
          resolve(text || '');
        } else {
          reject(new Error('请求失败，状态码：' + res.statusCode));
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络异常'));
      }
    });
  });
}

/**
 * 发送聊天消息（流式，打字机效果）
 * 需要基础库 >= 2.20.1，且 config.stream = true
 * @param {Array} messages
 * @param {Function} onDelta 每收到一段增量文本时回调 (deltaText) => void
 * @returns {Promise<string>} 完整回复文本
 */
function sendChatMessageStream(messages, onDelta) {
  return new Promise((resolve, reject) => {
    const task = wx.request({
      url: config.apiBaseUrl + config.chatPath,
      method: 'POST',
      timeout: 120000,
      enableChunked: true,
      header: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + config.apiKey
      },
      data: {
        model: config.model,
        messages: [
          { role: 'system', content: config.systemPrompt },
          ...messages
        ],
        stream: true
      },
      success() {},
      fail(err) {
        reject(new Error(err.errMsg || '网络异常'));
      }
    });

    let fullText = '';
    task.onChunkReceived((res) => {
      try {
        const buffer = res.data;
        // 将 ArrayBuffer 转为字符串
        const decoder = new TextDecoder('utf-8');
        const chunk = decoder.decode(buffer);
        // SSE 格式，按行解析 data: {...}
        const lines = chunk.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (jsonStr === '[DONE]') continue;
          const obj = JSON.parse(jsonStr);
          const delta = obj.choices && obj.choices[0] && obj.choices[0].delta && obj.choices[0].delta.content;
          if (delta) {
            fullText += delta;
            if (typeof onDelta === 'function') onDelta(delta);
          }
        }
      } catch (e) {
        // 忽略解析中的部分包
      }
    });
  });
}

module.exports = {
  sendChatMessage,
  sendChatMessageStream
};
