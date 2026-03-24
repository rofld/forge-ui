'use client';

import { createContext, useContext, ReactNode } from 'react';

interface ChatContextType {
  sendAction: (prompt: string) => void;
  isStreaming: boolean;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({
  children,
  sendAction,
  isStreaming,
}: {
  children: ReactNode;
  sendAction: (prompt: string) => void;
  isStreaming: boolean;
}) {
  return (
    <ChatContext.Provider value={{ sendAction, isStreaming }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatActions(): ChatContextType | null {
  return useContext(ChatContext);
}
