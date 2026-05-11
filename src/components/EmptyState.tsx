'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createThread, postMessage } from '@/lib/api';
import Composer from '@/components/chat/Composer';

interface EmptyStateProps {
  projectId?: string | null;
}

export default function EmptyState({ projectId = null }: EmptyStateProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [lastModel, setLastModel] = useState<string>('opus');

  // Load last-used model from localStorage on mount
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('last-used-model') : null;
    if (saved) {
      setLastModel(saved);
    }
  }, []);

  async function handleSubmit(
    content: string,
    model?: string,
    thinkingBudget?: number,
    effort?: string
  ) {
    if (!content.trim() || isLoading) return;

    setIsLoading(true);
    try {
      // Save the selected model to localStorage for next time
      if (model) {
        localStorage.setItem('last-used-model', model);
      }

      // 1. Create a new personal thread (projectId is null for pre-Sprint-15)
      const thread = await createThread({
        id: undefined, // Let server auto-generate ID
        model,
      });

      // 2. Navigate to the new thread
      router.push(`/threads/${thread.id}`);

      // 3. Send the prompt as the first message
      //    Note: postMessage returns the fetch Response, not the result.
      //    We don't await or process it — let the SSE handler in the thread page deal with it.
      await postMessage(
        thread.id,
        content,
        model,
        thinkingBudget,
        effort
      );
    } catch (err) {
      console.error('Failed to create thread or send message:', err);
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-light text-stone-200 mb-2">
          What would you like to work on?
        </h1>
        <p className="text-sm text-stone-500">
          Start a new conversation — it will be saved to your personal space
        </p>
      </div>

      {/* Composer centered, constrained width for mobile */}
      <div className="w-full max-w-2xl">
        <Composer
          onSend={handleSubmit}
          disabled={isLoading}
          onClose={() => {
            /* no-op for empty state */
          }}
          defaultModel={lastModel}
        />
      </div>
    </div>
  );
}
