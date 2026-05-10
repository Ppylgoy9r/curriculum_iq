export type OllamaChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const OLLAMA_API_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b'

export async function createOllamaChatCompletion(
  messages: OllamaChatMessage[],
  temperature = 0.25
) {
  const response = await fetch(`${OLLAMA_API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      temperature,
      max_tokens: 1000,
    }),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(
      `Ollama request failed ${response.status} ${response.statusText}: ${details}`
    )
  }

  return (await response.json()) as {
    id: string
    object: string
    created: number
    model: string
    choices: Array<{ index: number; message: { role: string; content: string }; finish_reason: string }>
  }
}
