import { createOpenAI } from '@ai-sdk/openai'
import { experimental_transcribe as transcribe } from 'ai'
import { onMounted, ref } from 'vue'

export function useSpeechToText() {
  const isSupported = ref(false)
  const isRecording = ref(false)
  const transcribing = ref(false)
  const error = ref<string | null>(null)
  const audioBlob = ref<Blob | null>(null)

  let mediaRecorder: MediaRecorder | null = null
  let mediaStream: MediaStream | null = null
  let chunks: BlobPart[] = []

  onMounted(() => {
    try {
      const hasNavigator = typeof navigator !== 'undefined'
      const hasMedia = hasNavigator && !!navigator.mediaDevices
      const hasRecorder = globalThis.window !== undefined && 'MediaRecorder' in globalThis
      isSupported.value = !!(hasMedia && hasRecorder)
    }
    catch {
      isSupported.value = false
    }
  })

  async function startRecording() {
    error.value = null
    audioBlob.value = null
    if (!isSupported.value) {
      error.value = 'This browser does not support audio recording.'
      return
    }
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        '',
      ]
      let mimeType = ''
      for (const t of mimeTypes) {
        if (t === '' || MediaRecorder.isTypeSupported(t)) {
          mimeType = t
          break
        }
      }
      chunks = []
      mediaRecorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined)
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data)
        }
      }
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mediaRecorder?.mimeType || 'audio/webm' })
        audioBlob.value = blob
        chunks = []
        // stop tracks
        if (mediaStream) {
          for (const t of mediaStream.getTracks()) t.stop()
        }
        mediaStream = null
      }
      mediaRecorder.start()
      isRecording.value = true
    }
    catch (error_: any) {
      error.value = error_?.message || 'Failed to start recording.'
      stopRecording()
    }
  }

  function stopRecording() {
    if (mediaRecorder && isRecording.value) {
      mediaRecorder.stop()
    }
    isRecording.value = false
  }

  async function transcribeWithWhisper(options: { apiKey: string, serviceUrl: string, model?: string, language?: string }) {
    if (!audioBlob.value) {
      error.value = 'No audio to transcribe.'
      return ''
    }
    const { apiKey, serviceUrl, model = 'whisper-1', language } = options
    error.value = null
    transcribing.value = true
    try {
      // Preferred: Vercel AI SDK transcription
      const openai = createOpenAI({ apiKey, baseURL: serviceUrl })
      const transcriptionModel = openai.transcription(model as any)
      const file = new File([audioBlob.value], 'audio.webm', { type: audioBlob.value.type || 'audio/webm' })
      const buffer = await file.arrayBuffer()
      const audio = new Uint8Array(buffer)
      const result = await transcribe({
        model: transcriptionModel,
        audio,
        providerOptions: language ? { openai: { language } } : undefined,
      })
      return result.text || ''
    }
    catch (error_: any) {
      // Fallback: REST call to OpenAI-compatible endpoint
      try {
        const form = new FormData()
        const file = new File([audioBlob.value], 'audio.webm', { type: audioBlob.value.type || 'audio/webm' })
        form.append('file', file)
        form.append('model', model)
        if (language) {
          form.append('language', language)
        }

        const url = `${serviceUrl.replace(/\/?$/, '')}/audio/transcriptions`
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: form,
        })
        if (!res.ok) {
          const text = await res.text()
          throw new Error(`Transcription failed: ${res.status} ${text}`)
        }
        const data = await res.json() as { text?: string }
        const text = data.text || ''
        return text
      }
      catch (error__: any) {
        error.value = error__?.message || error_?.message || 'Transcription failed.'
        return ''
      }
    }
    finally {
      transcribing.value = false
    }
  }

  function reset() {
    audioBlob.value = null
    error.value = null
    transcribing.value = false
    isRecording.value = false
  }

  return {
    // state
    isSupported,
    isRecording,
    transcribing,
    audioBlob,
    error,
    // actions
    startRecording,
    stopRecording,
    transcribeWithWhisper,
    reset,
  }
}
