<template>
  <div class="notice-host" role="status" aria-live="polite">
    <div
      v-for="n in notices"
      :key="n.id"
      :class="['notice', n.type]"
      @click="dismissNotice(n.id)"
    >
      <i :class="['mdi', iconFor(n.type)]"></i>
      <span class="notice-text">{{ n.text }}</span>
      <i class="mdi mdi-close notice-close"></i>
    </div>
  </div>
</template>

<script setup>
import { notices, dismissNotice } from '../utils/notify'

const iconFor = (type) => ({
  error: 'mdi-alert-circle',
  warning: 'mdi-alert',
  success: 'mdi-check-circle'
})[type] || 'mdi-information'
</script>

<style scoped>
/* 高於各頁彈窗（z-index 100～200），彈窗開著時也看得到 */
.notice-host { position: fixed; top: 16px; right: 16px; z-index: 10000; display: flex; flex-direction: column; gap: 8px; width: 360px; max-width: calc(100vw - 32px); pointer-events: none; }
.notice { pointer-events: auto; display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border-radius: 8px; font-size: 13px; line-height: 1.5; cursor: pointer; box-shadow: 0 6px 20px rgba(15, 23, 42, 0.15); border: 1px solid; background: var(--c-surface); }
.notice .mdi { font-size: 18px; line-height: 1.2; }
.notice-text { flex: 1; word-break: break-word; }
.notice-close { font-size: 14px !important; opacity: 0.5; }
.notice.success { border-color: #bbf7d0; background: var(--c-success-soft-2); color: var(--c-success-text); }
.notice.warning { border-color: var(--c-warn-border); background: var(--c-warn-soft-2); color: var(--c-warn-text); }
.notice.error { border-color: var(--c-danger-border); background: var(--c-danger-soft-2); color: var(--c-danger-text); }
/* 用 CSS 動畫淡入：就算分頁在背景、動畫沒播放，提示也一樣看得到 */
.notice { animation: notice-in 0.2s ease-out; }
@keyframes notice-in { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: none; } }
</style>
