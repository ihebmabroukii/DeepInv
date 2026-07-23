"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Bot, User, BrainCircuit, Shield, Terminal, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  role: "user" | "ai"
  content: string
  timestamp: Date
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "ai",
      content: "Hello! I am the **Attijari SOC Copilot**. I am connected to your live security telemetry. How can I assist you with threat hunting or incident response today?",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const res = await fetch("http://localhost:8001/api/v1/chat/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMessage.content })
      })

      if (!res.ok) throw new Error("Failed to fetch response")

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No stream available")

      const decoder = new TextDecoder()
      const aiMessageId = (Date.now() + 1).toString()

      setMessages(prev => [
        ...prev,
        { id: aiMessageId, role: "ai", content: "", timestamp: new Date() }
      ])
      
      setIsLoading(false)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId ? { ...msg, content: msg.content + chunk } : msg
        ))
      }
    } catch (error) {
      console.error(error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: "⚠️ I encountered an error communicating with the backend API. Please ensure the `soc-ai` service is running.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <BrainCircuit className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            Attijari SOC Copilot
          </h1>
          <p className="text-sm text-muted-foreground">Natural language threat hunting & intelligence</p>
        </div>
      </div>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col border-border/50 bg-card/50 backdrop-blur overflow-hidden shadow-2xl">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex items-start gap-4 max-w-[85%]",
                msg.role === "user" ? "ml-auto flex-row-reverse" : ""
              )}
            >
              {/* Avatar */}
              <div className={cn(
                "flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center shadow-sm",
                msg.role === "user" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-secondary border border-border"
              )}>
                {msg.role === "user" ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5 text-orange-500" />}
              </div>

              {/* Message Bubble */}
              <div className={cn(
                "rounded-2xl p-4 shadow-sm text-sm",
                msg.role === "user" 
                  ? "bg-primary text-primary-foreground rounded-tr-none" 
                  : "bg-secondary/50 border border-border/50 rounded-tl-none prose prose-sm dark:prose-invert max-w-none"
              )}>
                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <ReactMarkdown
                    components={{
                      code({node, className, children, ...props}: any) {
                        const match = /language-(\w+)/.exec(className || '')
                        return match ? (
                          <div className="relative mt-2 rounded-md bg-black border border-white/10 overflow-hidden">
                            <div className="flex items-center px-3 py-1.5 bg-white/5 border-b border-white/10">
                              <Terminal className="h-3 w-3 mr-2 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground font-mono">{match[1] || 'bash'}</span>
                            </div>
                            <pre className="p-3 overflow-x-auto">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </pre>
                          </div>
                        ) : (
                          <code className="bg-white/10 px-1.5 py-0.5 rounded-md font-mono text-orange-300" {...props}>
                            {children}
                          </code>
                        )
                      }
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                )}
                <span className={cn(
                  "block text-[10px] mt-2 opacity-60 font-mono",
                  msg.role === "user" ? "text-right" : "text-left"
                )}>
                  {msg.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start gap-4 max-w-[85%]">
              <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-secondary border border-border flex items-center justify-center shadow-sm">
                <Bot className="h-5 w-5 text-orange-500" />
              </div>
              <div className="bg-secondary/50 border border-border/50 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                <span className="text-sm text-muted-foreground animate-pulse">Analyzing telemetry...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input Area */}
        <div className="p-4 border-t border-border/50 bg-background/50">
          <div className="relative flex items-center">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the SOC Copilot... (e.g. 'Show me recent Brute Force attempts')"
              className="pr-12 py-6 rounded-xl border-border bg-secondary/50 focus-visible:ring-orange-500"
              disabled={isLoading}
            />
            <Button 
              size="icon" 
              className="absolute right-2 h-8 w-8 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-transform active:scale-95 disabled:opacity-50"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-end text-xs text-muted-foreground px-2">
            <span>Press <kbd className="font-mono bg-secondary px-1 py-0.5 rounded border border-border">Enter</kbd> to send</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
