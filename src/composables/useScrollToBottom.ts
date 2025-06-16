import { nextTick, onBeforeUnmount, ref } from 'vue'

export function useScrollToBottom(containerRef: Ref<HTMLElement | null>, scrollThreshold = 50, enable: MaybeRef<boolean> = true) {
  // 滚动容器的引用

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

  /**
   * 监听内容变化
   */
  const observeContentChange = () => {
    if (!containerRef.value) {
      return
    }

    // 创建一个 MutationObserver 来监听内容变化
    const observer = new MutationObserver(async () => {
      if (!containerRef.value) {
        return
      }

      // 等待 DOM 更新完成
      await nextTick()

      const { scrollHeight } = containerRef.value

      // 内容高度增加且处于吸附状态，则滚动到底部
      if (scrollHeight > lastContentHeight.value && isStickToBottom.value) {
        scrollToBottom()
      }

      // 更新最后内容高度
      lastContentHeight.value = scrollHeight
    })

    // 开始观察内容变化
    observer.observe(containerRef.value, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    // 返回 observer 用于清理
    return observer
  }

  // 存储 observer 引用以便清理
  let observer = observeContentChange()
  watch([containerRef], () => {
    if (containerRef.value) {
      // 添加滚动事件监听器
      containerRef.value.addEventListener('scroll', handleScroll)

      // 初始化 observer
      observer = observeContentChange()

      // 获取初始内容高度
      lastContentHeight.value = containerRef.value.scrollHeight

      // 初始化时滚动到底部
      scrollToBottom()
    }
  })

  onBeforeUnmount(() => {
    // 清理事件监听器
    if (containerRef.value) {
      containerRef.value.removeEventListener('scroll', handleScroll)
    }

    // 清理 observer
    if (observer) {
      observer.disconnect()
    }
  })
}
