"use client";

import Image from "next/image";
import { Heart, Download, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import { useEmoji } from '../contexts/emoji-context';

interface Emoji {
  id: number;
  image_url: string;
  prompt: string;
  likes_count: number;
  creator_user_id: string;
  is_liked_by_user?: boolean;
}

export default function EmojiGrid() {
  const [emojis, setEmojis] = useState<Emoji[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUser();
  const isAdmin = user?.primaryEmailAddress?.emailAddress === 'blodrena1@gmail.com';
  const { emojis: contextEmojis, addEmoji } = useEmoji();

  useEffect(() => {
    fetchEmojis();

    // Set up real-time listener
    const channel = supabase
      .channel('public:emojis')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emojis' }, payload => {
        if (payload.eventType === 'INSERT') {
          setEmojis(currentEmojis => {
            const newEmoji = payload.new as Emoji;
            if (!currentEmojis.some(emoji => emoji.id === newEmoji.id)) {
              return [newEmoji, ...currentEmojis];
            }
            return currentEmojis;
          });
        } else if (payload.eventType === 'UPDATE') {
          setEmojis(currentEmojis => 
            currentEmojis.map(emoji => 
              emoji.id === payload.new.id ? { ...emoji, ...payload.new as Emoji } : emoji
            )
          );
        } else if (payload.eventType === 'DELETE') {
          setEmojis(currentEmojis => 
            currentEmojis.filter(emoji => emoji.id !== payload.old.id)
          );
        }
      })
      .subscribe();

    // Fetch emojis immediately when component mounts
    fetchEmojis();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (contextEmojis.length > 0) {
      setEmojis(currentEmojis => {
        const newEmojis = contextEmojis.filter(newEmoji => 
          newEmoji.image_url && // Ensure the emoji has an image URL
          !currentEmojis.some(existingEmoji => existingEmoji.id === newEmoji.id)
        );
        // Combine new emojis with existing ones, removing duplicates
        const combinedEmojis = [...newEmojis, ...currentEmojis];
        return combinedEmojis.filter((emoji, index, self) =>
          index === self.findIndex((t) => t.id === emoji.id)
        );
      });
    }
  }, [contextEmojis]);

  const fetchEmojis = async () => {
    try {
      const { data, error } = await supabase
        .from('emojis')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (user) {
        const { data: likes, error: likesError } = await supabase
          .from('emoji_likes')
          .select('emoji_id')
          .eq('user_id', user.id);

        if (likesError) throw likesError;

        const likedEmojiIds = new Set(likes.map(like => like.emoji_id));

        const emojisWithLikeStatus = data.map(emoji => ({
          ...emoji,
          is_liked_by_user: likedEmojiIds.has(emoji.id)
        }));

        setEmojis(emojisWithLikeStatus);
      } else {
        setEmojis(data.map(emoji => ({ ...emoji, is_liked_by_user: false })));
      }
    } catch (error) {
      console.error('Error fetching emojis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLike = async (emojiId: number) => {
    if (!user) return;

    try {
      console.log(`Toggling like for emoji ${emojiId}`);
      const emoji = emojis.find(e => e.id === emojiId);
      if (!emoji) {
        console.error(`Emoji with id ${emojiId} not found`);
        return;
      }

      const { data: existingLike, error: likeError } = await supabase
        .from('emoji_likes')
        .select('*')
        .eq('user_id', user.id)
        .eq('emoji_id', emojiId)
        .single();

      if (likeError && likeError.code !== 'PGRST116') throw likeError;

      let newLikesCount = emoji.likes_count;
      let isLiked = emoji.is_liked_by_user;

      console.log(`Current like status: ${isLiked}, Current likes count: ${newLikesCount}`);

      if (existingLike) {
        console.log(`Unliking emoji ${emojiId}`);
        const { error: deleteError } = await supabase
          .from('emoji_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('emoji_id', emojiId);

        if (deleteError) throw deleteError;
        newLikesCount--;
        isLiked = false;
      } else {
        console.log(`Liking emoji ${emojiId}`);
        const { error: insertError } = await supabase
          .from('emoji_likes')
          .insert({ user_id: user.id, emoji_id: emojiId });

        if (insertError) throw insertError;
        newLikesCount++;
        isLiked = true;
      }

      console.log(`Updating emoji ${emojiId} with new likes count: ${newLikesCount}`);
      const { error: updateError } = await supabase
        .from('emojis')
        .update({ likes_count: newLikesCount })
        .eq('id', emojiId);

      if (updateError) throw updateError;

      console.log(`Updating local state for emoji ${emojiId}`);
      setEmojis(currentEmojis =>
        currentEmojis.map(e =>
          e.id === emojiId ? { ...e, likes_count: newLikesCount, is_liked_by_user: isLiked } : e
        )
      );
      console.log(`Emoji ${emojiId} updated. New like status: ${isLiked}, New likes count: ${newLikesCount}`);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleDelete = async (emojiId: number) => {
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from('emojis')
        .delete()
        .eq('id', emojiId);

      if (error) throw error;

      setEmojis(currentEmojis => currentEmojis.filter(emoji => emoji.id !== emojiId));
    } catch (error) {
      console.error('Error deleting emoji:', error);
    }
  };

  const handleDownload = async (url: string, prompt: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const timestamp = new Date().getTime();
      const sanitizedPrompt = prompt.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      link.download = `emoji-${sanitizedPrompt}-${timestamp}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading emoji:', error);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="mt-8">
      {emojis.length === 0 ? (
        <p className="text-center text-gray-500">No emojis generated yet. Create your first emoji!</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {emojis.map((emoji) => (
            <div key={emoji.id} className="relative group">
              <Image
                src={emoji.image_url}
                alt={`Generated Emoji: ${emoji.prompt}`}
                width={200}
                height={200}
                className="w-full h-auto rounded-lg shadow-md transition-transform group-hover:scale-105"
                onError={(e) => {
                  console.error(`Error loading image: ${emoji.image_url}`);
                  e.currentTarget.src = "/placeholder.png";
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white hover:text-purple-300"
                  onClick={() => toggleLike(emoji.id)}
                >
                  <Heart 
                    className={`h-6 w-6 ${emoji.is_liked_by_user ? 'fill-current text-red-500' : ''}`} 
                    fill={emoji.is_liked_by_user ? 'currentColor' : 'none'}
                  />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white hover:text-purple-300"
                  onClick={() => handleDownload(emoji.image_url, emoji.prompt)}
                >
                  <Download className="h-6 w-6" />
                </Button>
                {isAdmin && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:text-red-300"
                    onClick={() => handleDelete(emoji.id)}
                  >
                    <Trash2 className="h-6 w-6" />
                  </Button>
                )}
              </div>
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded-md text-sm">
                {emoji.likes_count} {emoji.likes_count === 1 ? 'like' : 'likes'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
