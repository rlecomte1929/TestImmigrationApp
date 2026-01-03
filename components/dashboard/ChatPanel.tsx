'use client';

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export default function ChatPanel({ isOpen, onClose, initialQuery }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const tidyText = (text: string) => {
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .replace(/[*_`#>~]/g, "")
        .replace(/\s+/g, " ")
        .replace(/[^a-z0-9 ]+/g, "")
        .trim();

    const lines = text.split(/\r?\n/);
    const out: string[] = [];
    const seenKeys = new Set<string>();
    
    for (const raw of lines) {
      const trimmed = raw.trim();
      const isBrand = /^(ask burt|bureau ai)$/i.test(trimmed);
      if (isBrand) continue; // drop accidental model echoes of titles
      
      if (trimmed.length === 0) {
        if (out.length === 0 || out[out.length - 1].trim().length === 0) continue; // collapse blanks
        out.push("");
        continue;
      }
      
      const key = normalize(trimmed);
      
      // Skip duplicates (including headers that appear multiple times)
      if (key && seenKeys.has(key)) continue;
      
      // Special handling for repeated headers
      if (key && key.length > 10 && trimmed === trimmed.toUpperCase()) {
        // If this looks like a header and we've seen similar content, skip it
        if (Array.from(seenKeys).some(existingKey => 
          existingKey.includes(key.slice(0, Math.min(key.length, 15))) || 
          key.includes(existingKey.slice(0, Math.min(existingKey.length, 15)))
        )) {
          continue;
        }
      }
      
      out.push(raw);
      if (key) seenKeys.add(key);
    }
    return out.join("\n").trim();
  };

  const trimToSentence = (text: string) => {
    const t = text.trim();
    if (/[.!?)]\s*$/.test(t)) return t;
    const lastDot = t.lastIndexOf(".");
    const lastQ = t.lastIndexOf("?");
    const lastE = t.lastIndexOf("!");
    const lastEnd = Math.max(lastDot, lastQ, lastE);
    if (lastEnd > 40) return t.slice(0, lastEnd + 1);
    return t; // keep as-is if we can't find a safe boundary
  };

  const handleSend = useCallback(async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase credentials");
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/chat-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast({
            title: "Rate limit exceeded",
            description: "Please try again later.",
            variant: "destructive",
          });
          return;
        }
        if (response.status === 402) {
          toast({
            title: "Payment required",
            description: "Please add credits to your workspace.",
            variant: "destructive",
          });
          return;
        }
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      if (reader) {
        let done = false;
        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          if (value) {
            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    assistantMessage += content;
                    setMessages((prev) => {
                      const newMessages = [...prev];
                      const lastMessage = newMessages[newMessages.length - 1];
                      if (lastMessage?.role === "assistant") {
                        lastMessage.content = assistantMessage;
                      } else {
                        newMessages.push({ role: "assistant", content: assistantMessage });
                      }
                      return newMessages;
                    });
                  }
                } catch (e) {
                  // Ignore parsing errors for incomplete chunks
                }
              }
            }
          }
        }
        if (assistantMessage) {
          console.log('🔍 Raw assistant message before tidyText:', JSON.stringify(assistantMessage));
          console.log('🔍 Raw assistant message lines:', assistantMessage.split('\n'));
          const finalClean = trimToSentence(tidyText(assistantMessage));
          console.log('🔍 After tidyText processing:', JSON.stringify(finalClean));
          console.log('🔍 After tidyText lines:', finalClean.split('\n'));
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage?.role === "assistant") {
              lastMessage.content = finalClean;
            }
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, toast]);

  useEffect(() => {
    if (initialQuery && messages.length === 0) {
      console.log('🔍 ChatPanel initialQuery received:', JSON.stringify(initialQuery));
      console.log('🔍 InitialQuery lines:', initialQuery.split('\n'));
      handleSend(initialQuery);
    }
  }, [initialQuery, messages.length, handleSend]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isOpen) return null;

  return (
    <div className="w-full bg-background border-l border-border shadow-lg flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold text-lg">Bureau AI</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === "user"
                    ? "bg-foreground text-background"
                    : "bg-muted text-foreground"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="relative p-1.5 rounded-xl bg-muted/60 border">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask a question..."
            className="h-28 text-sm p-3 pr-12 bg-background border-0 focus:ring-0 focus:outline-none rounded-xl resize-none"
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="absolute right-3 bottom-3 h-10 w-10 rounded-lg"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
