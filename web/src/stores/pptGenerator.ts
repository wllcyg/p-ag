import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { GeneratePptDto, SlideItem, GenStep, GenEventPayload, ThemeType } from '../types/ppt';
import { useAuthStore } from './auth';

export const usePptGeneratorStore = defineStore('pptGenerator', () => {
  const authStore = useAuthStore();

  // 表单状态
  const formData = ref<GeneratePptDto>({
    subject: '语文',
    grade: '初中八年级',
    lessonTitle: '',
    textbookVersion: '人教版',
    extraRequirement: '',
    theme: 'cat-purple' as ThemeType,
  });

  // 运行状态
  const status = ref<'idle' | 'generating' | 'done' | 'error'>('idle');
  const currentStep = ref<GenStep | null>(null);
  const progress = ref<number>(0);
  const statusMessage = ref<string>('');
  const reasoningText = ref<string>('');
  const slides = ref<SlideItem[]>([]);
  const downloadUrl = ref<string>('');
  const errorMessage = ref<string>('');

  const isGenerating = computed(() => status.value === 'generating');
  const isDone = computed(() => status.value === 'done');
  const hasSlides = computed(() => slides.value.length > 0);

  /**
   * 重置生成状态
   */
  function reset() {
    status.value = 'idle';
    currentStep.value = null;
    progress.value = 0;
    statusMessage.value = '';
    reasoningText.value = '';
    slides.value = [];
    downloadUrl.value = '';
    errorMessage.value = '';
  }

  /**
   * 发起 SSE 流式生成请求
   */
  async function startGeneration() {
    if (!formData.value.lessonTitle.trim()) {
      errorMessage.value = '请输入课题名称';
      return;
    }

    reset();
    status.value = 'generating';
    statusMessage.value = '正在连接生成引擎...';
    progress.value = 5;

    const token = authStore.getAccessToken();
    const apiUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:7860'}/api/ppt/generate-stream`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData.value),
      });

      if (!response.ok || !response.body) {
        throw new Error(`服务器响应异常: ${response.status} ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // 最后一个可能未闭合，保留在 buffer 中

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const payload: GenEventPayload = JSON.parse(trimmed.slice(6));
              handleEvent(payload);
            } catch (err) {
              console.warn('解析 SSE 消息失败:', trimmed, err);
            }
          }
        }
      }

      // 如果流结束但没有显式抛错且产生了幻灯片，标记为完成
      if (status.value === 'generating') {
        status.value = 'done';
        progress.value = 100;
        statusMessage.value = '生成完成！';
      }
    } catch (err: any) {
      status.value = 'error';
      errorMessage.value = err.message || '生成过程出现未知错误，请重试';
      statusMessage.value = '生成失败';
      console.error('SSE 流式生成异常:', err);
    }
  }

  /**
   * 处理单条 SSE 事件
   */
  function handleEvent(event: GenEventPayload) {
    if (event.step) currentStep.value = event.step;
    if (typeof event.progress === 'number') progress.value = event.progress;
    if (event.message) statusMessage.value = event.message;

    switch (event.type) {
      case 'thinking':
        if (event.reasoningChunk) {
          reasoningText.value += event.reasoningChunk;
        }
        break;

      case 'slide':
        if (event.slideData) {
          const existsIdx = slides.value.findIndex(
            (s) => s.pageIndex === event.slideData!.pageIndex,
          );
          if (existsIdx >= 0) {
            slides.value[existsIdx] = event.slideData;
          } else {
            slides.value.push(event.slideData);
            slides.value.sort((a, b) => a.pageIndex - b.pageIndex);
          }
        }
        break;

      case 'done':
        status.value = 'done';
        progress.value = 100;
        if (event.downloadUrl) {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7860';
          downloadUrl.value = event.downloadUrl.startsWith('http')
            ? event.downloadUrl
            : `${baseUrl}${event.downloadUrl}`;
        }
        break;

      case 'error':
        status.value = 'error';
        errorMessage.value = event.message || '生成失败';
        break;
    }
  }

  return {
    formData,
    status,
    currentStep,
    progress,
    statusMessage,
    reasoningText,
    slides,
    downloadUrl,
    errorMessage,
    isGenerating,
    isDone,
    hasSlides,
    startGeneration,
    reset,
  };
});
