"use client";
import { useCallback } from "react";
import { EmojiProvider } from "./contexts/emoji-context";
import EmojiGenerator from "./components/emoji-generator";
import EmojiGrid from "./components/emoji-grid";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useUser } from "@clerk/nextjs";
import { toast } from "react-hot-toast";

interface Emoji {
  id: number;
  image_url: string;
  prompt: string;
  likes_count: number;
  creator_user_id: string;
  is_liked_by_user: boolean;
  deleted: boolean;
}

export default function Home() {
  const { user } = useUser();
  const supabase = createClientComponentClient();

  const handleNewEmojiCreated = useCallback((newEmoji: Emoji) => {
    console.log("New emoji created:", newEmoji);
    // You might want to update EmojiGrid here or use a context to manage state
  }, []);

  return (
    <EmojiProvider>
      <div className="min-h-screen bg-gradient-to-b from-purple-100 to-pink-100 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
          <div className="p-6">
            <h1 className="text-4xl font-bold text-center mb-8 text-purple-800">Emoji Maker</h1>
            <EmojiGenerator onEmojiCreated={handleNewEmojiCreated} />
            <EmojiGrid />
          </div>
        </div>
      </div>
    </EmojiProvider>
  );
}
