export function useScrollControl() {
  const enableAutoScroll = ref(false)

  function easeInOutQuad(time: number, start: number, change: number, duration: number): number {
    time /= duration / 2
    if (time < 1) {
      return change / 2 * time * time + start
    }
    time--
    return -change / 2 * (time * (time - 2) - 1) + start
  }

  function scrollToBottomSmoothly(
    element: { scrollTop: number, scrollHeight: number, clientHeight: number },
    duration: number
  ): void {
    const start = element.scrollTop
    const end = element.scrollHeight - element.clientHeight
    const distance = end - start
    const startTime = performance.now()

    function scroll() {
      const currentTime = performance.now()
      const timeElapsed = currentTime - startTime
      element.scrollTop = easeInOutQuad(timeElapsed, start, distance, duration)
      if (timeElapsed < duration) {
        requestAnimationFrame(scroll)
      }
      else {
        element.scrollTop = end
        enableAutoScroll.value = true
      }
    }

    scroll()
  }

  function scrollToBottom(element: HTMLElement | null, duration: number = 1000): void {
    if (element) {
      scrollToBottomSmoothly(element, duration)
    }
  }

  // Auto-scroll when new content is added
  function setupAutoScroll(scrollArea: Ref<HTMLElement | null>, threshold: number = 50) {
    const scrollToBottom = useScrollToBottom(scrollArea, threshold, enableAutoScroll)
    return scrollToBottom
  }

  return {
    enableAutoScroll: readonly(enableAutoScroll),
    scrollToBottom,
    scrollToBottomSmoothly,
    setupAutoScroll,
  }
}