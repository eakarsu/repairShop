'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface AiDiagnosticChatProps {
  ticketId: string
  initialMessages?: Message[]
  sessionId?: string
  onSessionUpdate?: (sessionId: string) => void
  deviceInfo?: {
    type: string
    brand?: string
    model?: string
  }
  issueDescription?: string
}

export default function AiDiagnosticChat({
  ticketId,
  initialMessages = [],
  sessionId: initialSessionId,
  onSessionUpdate,
  deviceInfo,
  issueDescription
}: AiDiagnosticChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState(initialSessionId)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [possibleIssues, setPossibleIssues] = useState<string[]>([])
  const [suggestedTests, setSuggestedTests] = useState<string[]>([])
  const [confidence, setConfidence] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      createdAt: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/ai/diagnostic-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          message: content.trim(),
          sessionId,
          deviceInfo,
          issueDescription
        })
      })

      const data = await res.json()

      if (data.success) {
        const assistantMessage: Message = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.data.response,
          createdAt: new Date().toISOString()
        }
        setMessages(prev => [...prev, assistantMessage])

        if (data.data.sessionId && data.data.sessionId !== sessionId) {
          setSessionId(data.data.sessionId)
          onSessionUpdate?.(data.data.sessionId)
        }

        setSuggestedQuestions(data.data.suggestedQuestions || [])
        setPossibleIssues(data.data.possibleIssues || [])
        setSuggestedTests(data.data.suggestedTests || [])
        setConfidence(data.data.confidence)
      } else {
        throw new Error(data.error || 'Failed to get response')
      }
    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        createdAt: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with confidence */}
      {confidence !== null && (
        <div className="p-3 bg-gray-50 border-b flex items-center justify-between">
          <span className="text-sm text-gray-600">Diagnostic Confidence</span>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  confidence >= 70 ? 'bg-green-500' :
                  confidence >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${confidence}%` }}
              />
            </div>
            <span className="text-sm font-medium">{confidence}%</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">🤖</div>
            <p className="font-medium">AI Diagnostic Assistant</p>
            <p className="text-sm mt-2">
              Describe the symptoms or issues you're observing, and I'll help diagnose the problem.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <span className={`text-xs mt-1 block ${
                message.role === 'user' ? 'text-blue-200' : 'text-gray-400'
              }`}>
                {new Date(message.createdAt).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {suggestedQuestions.length > 0 && (
        <div className="px-4 py-2 border-t bg-gray-50">
          <p className="text-xs text-gray-500 mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.slice(0, 3).map((q, i) => (
              <button
                key={i}
                onClick={() => handleSuggestedQuestion(q)}
                className="text-xs px-3 py-1 bg-white border rounded-full hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Summary */}
      {(possibleIssues.length > 0 || suggestedTests.length > 0) && (
        <div className="px-4 py-2 border-t bg-blue-50">
          <div className="grid grid-cols-2 gap-4 text-xs">
            {possibleIssues.length > 0 && (
              <div>
                <p className="font-medium text-blue-800 mb-1">Possible Issues:</p>
                <ul className="list-disc list-inside text-blue-700">
                  {possibleIssues.slice(0, 3).map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            {suggestedTests.length > 0 && (
              <div>
                <p className="font-medium text-blue-800 mb-1">Suggested Tests:</p>
                <ul className="list-disc list-inside text-blue-700">
                  {suggestedTests.slice(0, 3).map((test, i) => (
                    <li key={i}>{test}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe the symptoms..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
