"use client";

import React, { useState } from 'react';
import { useEmoji } from '../contexts/emoji-context';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Loader2 } from 'lucide-react';

export default function EmojiGenerator() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<{ message: string; details?: string } | null>(null);
  const { addEmoji } = useEmoji();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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

      addEmoji({ id: Date.now().toString(), url: data.url, prompt });
      setPrompt(''); // Clear the input after successful generation
    } catch (error) {
      console.error("Error generating emoji:", error);
      if (error instanceof Error) {
        setError({ 
          message: error.message, 
          details: (error as any).details // Type assertion for potential 'details' property
        });
      } else {
        setError({ message: "An unknown error occurred" });
      }
    } finally {
      setIsGenerating(false);
    }
  };

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