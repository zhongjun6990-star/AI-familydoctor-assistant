const config = require('../../config');
const api = require('../../utils/api');

let msgId = 0;
function nextId() {
  return ++msgId;
}

Page({
  data: {
    statusBarHeight: 20,
    currentProjectName: 'AI 助手',
    input: '',
    messages: [],
    typing: false,
    sidebarOpen: false,
    uploadOpen: false,
    scrollInto: '',
    projects: [
      { id: 1, name: '618 大促种草文案', time: '今天', color: '#378ADD' },
      { id: 2, name: '品牌公众号周更选题', time: '昨天', color: '#D85A30' },
      { id: 3, name: '短视频脚本库', time: '周三', color: '#1D9E75' },
      { id: 4, name: '竞品爆款拆解', time: '上周', color: '#D4537E' },
      { id: 5, name: '私域运营话术', time: '7-28', color: '#888780' }
    ]
  },

  onLoad() {
    const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: win.statusBarHeight || 20,
      messages: [
        { id: nextId(), role: 'assistant', type: 'text', content: '你好，钟老板！我是你的 AI 助手，有什么可以帮你？' }
      ]
    });
  },

  /* ===== 侧边栏 ===== */
  toggleSidebar() {
    this.setData({ sidebarOpen: !this.data.sidebarOpen, uploadOpen: false });
  },
  closeSidebar() {
    this.setData({ sidebarOpen: false });
  },
  openProject(e) {
    const p = this.data.projects[e.currentTarget.dataset.index];
    this.setData({ currentProjectName: p.name, sidebarOpen: false });
    wx.showToast({ title: '已切换到「' + p.name + '」', icon: 'none' });
  },

  /* ===== 新建项目 ===== */
  newProject() {
    this.setData({
      currentProjectName: '新对话',
      messages: [
        { id: nextId(), role: 'assistant', type: 'text', content: '你好，钟老板！我是你的 AI 助手，有什么可以帮你？' }
      ],
      input: '',
      scrollInto: ''
    });
    wx.showToast({ title: '已新建项目', icon: 'none' });
  },

  /* ===== 输入 ===== */
  onInput(e) {
    this.setData({ input: e.detail.value });
  },

  /* ===== 上传面板 ===== */
  toggleUpload() {
    this.setData({ uploadOpen: !this.data.uploadOpen, sidebarOpen: false });
  },
  closeUpload() {
    this.setData({ uploadOpen: false });
  },

  // 相机：拍照
  takePhoto() {
    this.setData({ uploadOpen: false });
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: (res) => {
        res.tempFiles.forEach((f) => this.handleUploaded(f, 'image'));
      }
    });
  },

  // 照片：从相册选图
  choosePhoto() {
    this.setData({ uploadOpen: false });
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        res.tempFiles.forEach((f) => this.handleUploaded(f, 'image'));
      }
    });
  },

  // 文件：从微信会话/本地选择文件
  chooseFile() {
    this.setData({ uploadOpen: false });
    wx.chooseMessageFile({
      count: 5,
      type: 'all',
      success: (res) => {
        res.tempFiles.forEach((f) => this.handleUploaded(f, 'file'));
      }
    });
  },

  // 插件：预留入口
  openPlugin() {
    this.setData({ uploadOpen: false });
    // TODO: 接入小程序插件。需在小程序后台「设置 - 第三方设置 - 插件管理」添加插件，
    // 并在 app.json 的 plugins 字段声明后，通过 requirePlugin('插件 appid') 调用。
    wx.showModal({
      title: '插件',
      content: '插件功能待接入，可在 app.json 配置 plugins 后使用。',
      showCancel: false
    });
  },

  // 统一处理上传结果
  handleUploaded(file, kind) {
    if (kind === 'image') {
      const msg = { id: nextId(), role: 'user', type: 'image', content: file.tempFilePath };
      this.data.messages.push(msg);
      this.setData({ messages: this.data.messages, scrollInto: 'msg-' + msg.id });
    } else {
      this.appendMessage('user', '[文件] ' + (file.name || '已选择文件'));
    }
    // TODO: 将图片/文件上传到服务器，拿到可访问 URL 后再一起传给大模型
  },

  /* ===== 发送 ===== */
  sendMessage() {
    const text = this.data.input.trim();
    if (!text) return;
    this.appendMessage('user', text);
    this.setData({ input: '' });
    this.callLLM();
  },

  appendMessage(role, content, type) {
    const msg = { id: nextId(), role, content, type: type || 'text' };
    this.data.messages.push(msg);
    this.setData({ messages: this.data.messages, scrollInto: 'msg-' + msg.id });
  },

  /* ===== 调用大模型 ===== */
  async callLLM() {
    // 组装上下文（排除图片消息）
    const history = this.data.messages
      .filter((m) => m.type === 'text' && m.content)
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

    this.setData({ typing: true });
    try {
      if (config.stream) {
        // 流式：先放一条空助手消息，再逐字追加
        const msg = { id: nextId(), role: 'assistant', type: 'text', content: '' };
        this.data.messages.push(msg);
        this.setData({ messages: this.data.messages, typing: false, scrollInto: 'msg-' + msg.id });
        await api.sendChatMessageStream(history, (delta) => {
          const idx = this.data.messages.findIndex((m) => m.id === msg.id);
          if (idx >= 0) {
            const key = 'messages[' + idx + '].content';
            this.setData({
              [key]: this.data.messages[idx].content + delta,
              scrollInto: 'msg-' + msg.id
            });
          }
        });
      } else {
        const reply = await api.sendChatMessage(history);
        this.appendMessage('assistant', reply);
      }
    } catch (e) {
      this.appendMessage('assistant', '抱歉，出错了：' + e.message);
    } finally {
      this.setData({ typing: false });
    }
  }
});
