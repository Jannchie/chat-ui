import { onBeforeUnmount, ref } from 'vue'

export function useScrollToBottom(
  containerRef: Ref<HTMLElement | null>,
  scrollThreshold = 50,
  enable: MaybeRef<boolean> = true,
) {
  // 是否自动吸附到底部
  const isStickToBottom = ref(false)

  // 最后一次内容高度
  const lastContentHeight = ref(0)

  /**
   * 检查是否接近底部
   */
  const isNearBottom = (): boolean => {
    if (!containerRef.value) {
      return false
    }

    const { scrollTop, scrollHeight, clientHeight } = containerRef.value
    // 计算距离底部的像素数
    const distanceToBottom = scrollHeight - scrollTop - clientHeight

    return distanceToBottom <= scrollThreshold
  }

  /**
   * 滚动到底部
   */
  const scrollToBottom = () => {
    if (!containerRef.value || !unref(enable)) {
      return
    }
    containerRef.value.scrollTop = containerRef.value.scrollHeight
  }

  /**
   * 处理滚动事件
   */
  const handleScroll = () => {
    if (!containerRef.value) {
      return
    }

    // 如果用户手动滚动到底部，重新激活吸附；否则用户向上滚动，取消吸附
    isStickToBottom.value = isNearBottom()
  }

  // 流式输出时每个 token 都会触发 DOM 变更，读 scrollHeight 会强制 reflow；
  // 按动画帧合并检查，一帧内的多次变更只读一次布局
  let scrollCheckFrame: number | null = null
  const scheduleScrollCheck = () => {
    if (scrollCheckFrame !== null) {
      return
    }
    scrollCheckFrame = requestAnimationFrame(() => {
      scrollCheckFrame = null
      if (!containerRef.value) {
        return
      }

      const { scrollHeight } = containerRef.value

      // 内容高度增加且处于吸附状态，则滚动到底部
      if (scrollHeight > lastContentHeight.value && isStickToBottom.value) {
        scrollToBottom()
      }

      // 更新最后内容高度
      lastContentHeight.value = scrollHeight
    })
  }

  // 单个 observer 复用，容器切换时先 disconnect 再重新 observe，避免泄漏
  const observer = new MutationObserver(scheduleScrollCheck)

  watch(
    containerRef,
    (container, previousContainer) => {
      observer.disconnect()
      previousContainer?.removeEventListener('scroll', handleScroll)

      if (!container) {
        return
      }

      container.addEventListener('scroll', handleScroll)
      observer.observe(container, {
        childList: true,
        subtree: true,
        characterData: true,
      })

      // 获取初始内容高度
      lastContentHeight.value = container.scrollHeight

      // 初始化时滚动到底部
      scrollToBottom()
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    observer.disconnect()
    containerRef.value?.removeEventListener('scroll', handleScroll)
    if (scrollCheckFrame !== null) {
      cancelAnimationFrame(scrollCheckFrame)
    }
  })
}
