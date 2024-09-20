"use client";
import { useState, useEffect, useCallback } from "react";
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
  const [emojis, setEmojis] = useState<Emoji[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUser();
  const supabase = createClientComponentClient();

  const fetchEmojis = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('emojis')
        .select('*')
        .order('created_at', { ascending: false });

      if (user?.primaryEmailAddress?.emailAddress !== 'blodrena1@gmail.com') {
        query = query.eq('deleted', false);
      }

      const { data: emojisData, error: emojisError } = await query;

      if (emojisError) throw emojisError;

      let userLikes: number[] = [];
      if (user) {
        const { data: likesData, error: likesError } = await supabase
          .from('emoji_likes')
          .select('emoji_id')
          .eq('user_id', user.id);

        if (likesError) throw likesError;
        userLikes = likesData.map(like => like.emoji_id);
      }

      const processedEmojis = emojisData
        .filter(emoji => emoji.image_url && emoji.image_url.startsWith('http'))
        .map(emoji => ({
          ...emoji,
          is_liked_by_user: userLikes.includes(emoji.id)
        }));

      setEmojis(processedEmojis);
    } catch (error) {
      console.error('Error fetching emojis:', error);
      toast.error("Failed to load emojis. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    fetchEmojis();
  }, [fetchEmojis]);

  const handleNewEmojiCreated = useCallback((newEmoji: Emoji) => {
    console.log("New emoji created:", newEmoji);
    setEmojis(prevEmojis => {
      const updatedEmojis = [newEmoji, ...prevEmojis];
      console.log("Updated emojis state:", updatedEmojis);
      return updatedEmojis;
    });
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
