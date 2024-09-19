"use client";

import React, { useState, useCallback } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Loader2 } from 'lucide-react';

interface EmojiGeneratorProps {
  onEmojiCreated: (newEmoji: Emoji) => void;
}

export default function EmojiGenerator({ onEmojiCreated }: EmojiGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<{ message: string; details?: string } | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-emoji", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      console.log("API response:", data);

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.url) {
        throw new Error("No URL returned from API");
      }

      const newEmoji = { 
        id: Date.now(), 
        image_url: data.url, 
        prompt, 
        likes_count: 0, 
        creator_user_id: '', 
        is_liked_by_user: false, 
        deleted: false 
      };
      console.log("Calling onEmojiCreated with:", newEmoji);
      onEmojiCreated(newEmoji);

      setPrompt('');
    } catch (error) {
      console.error("Error generating emoji:", error);
      if (error instanceof Error) {
        setError({ 
          message: error.message, 
          details: (error as any).details
        });
      } else {
        setError({ message: "An unknown error occurred" });
      }
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, onEmojiCreated]);

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex space-x-4">
        <Input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your emoji..."
          className="flex-grow text-black"
          disabled={isGenerating}
        />
        <Button 
          type="submit" 
          className="bg-purple-600 hover:bg-purple-700 text-white"
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate Emoji'
          )}
        </Button>
      </form>
      {error && (
        <div className="text-red-500">
          <p>{error.message}</p>
          {error.details && <p className="text-sm mt-1">{error.details}</p>}
        </div>
      )}
    </div>
  );
}
