"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import { useEmoji } from '../contexts/emoji-context';
import Image from "next/image";
import { Heart, Download, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";

interface Emoji {
  id: number;
  image_url: string;
  prompt: string;
  likes_count: number;
  creator_user_id: string;
  deleted: boolean;
}

export default function EmojiGrid() {
  const [emojis, setEmojis] = useState<Emoji[]>([]);
  const [userLikes, setUserLikes] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUser();
  const isAdmin = user?.primaryEmailAddress?.emailAddress === 'blodrena1@gmail.com';
  const { emojis: contextEmojis, addEmoji } = useEmoji();

  useEffect(() => {
    fetchEmojis();
    if (user) {
      fetchUserLikes();
    }

    const channel = supabase
      .channel('public:emojis_and_likes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emojis' }, payload => {
        if (payload.eventType === 'INSERT' && !(payload.new as Emoji).deleted) {
          setEmojis(currentEmojis => [payload.new as Emoji, ...currentEmojis]);
        } else if (payload.eventType === 'UPDATE') {
          setEmojis(currentEmojis => 
            currentEmojis.map(emoji => 
              emoji.id === payload.new.id ? { ...emoji, ...payload.new as Emoji } : emoji
            ).filter(emoji => !emoji.deleted)
          );
        } else if (payload.eventType === 'DELETE') {
          setEmojis(currentEmojis => 
            currentEmojis.filter(emoji => emoji.id !== payload.old.id)
          );
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emoji_likes' }, payload => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
          const emojiId = payload.new?.emoji_id || payload.old?.emoji_id;
          const change = payload.eventType === 'INSERT' ? 1 : -1;
          setEmojis(currentEmojis =>
            currentEmojis.map(emoji =>
              emoji.id === emojiId ? { ...emoji, likes_count: (emoji.likes_count || 0) + change } : emoji
            )
          );
        }
      })
      .subscribe();

    console.log('Subscribed to real-time changes');

    // Handle context emojis
    if (contextEmojis.length > 0) {
      setEmojis(currentEmojis => {
        const newEmojis = contextEmojis.filter(newEmoji => 
          newEmoji.image_url && 
          !currentEmojis.some(existingEmoji => existingEmoji.id === newEmoji.id) &&
          !newEmoji.deleted
        );
        return [...newEmojis, ...currentEmojis];
      });
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contextEmojis]);

  const fetchEmojis = async () => {
    try {
      const { data, error } = await supabase
        .from('emojis')
        .select('*')
        .eq('deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEmojis(data);
    } catch (error) {
      console.error('Error fetching emojis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserLikes = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('emoji_likes')
        .select('emoji_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const likedEmojiIds = new Set(data.map(like => like.emoji_id));
      setUserLikes(likedEmojiIds);
      
      // Update the emojis state to reflect the user's likes
      setEmojis(currentEmojis => 
        currentEmojis.map(emoji => ({
          ...emoji,
          isLikedByUser: likedEmojiIds.has(emoji.id)
        }))
      );

      console.log('User likes fetched and applied:', likedEmojiIds);
    } catch (error) {
      console.error('Error fetching user likes:', error);
    }
  };

  const handleLike = async (emojiId: number) => {
    if (!user) return;

    try {
      console.log(`Attempting to like/unlike emoji ${emojiId}`);
      const isLiked = userLikes.has(emojiId);

      if (isLiked) {
        // Unlike
        const { error: deleteError } = await supabase
          .from('emoji_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('emoji_id', emojiId);

        if (deleteError) throw deleteError;

        setUserLikes(prevLikes => {
          const newLikes = new Set(prevLikes);
          newLikes.delete(emojiId);
          return newLikes;
        });
        setEmojis(prevEmojis =>
          prevEmojis.map(emoji =>
            emoji.id === emojiId 
              ? { ...emoji, likes_count: emoji.likes_count - 1, isLikedByUser: false } 
              : emoji
          )
        );
        console.log(`Successfully unliked emoji ${emojiId}`);
      } else {
        // Like
        const { data, error } = await supabase
          .from('emoji_likes')
          .upsert({ user_id: user.id, emoji_id: emojiId }, { onConflict: 'user_id,emoji_id' })
          .select();

        if (error) throw error;

        if (data && data.length > 0) {
          setUserLikes(prevLikes => new Set(prevLikes).add(emojiId));
          setEmojis(prevEmojis =>
            prevEmojis.map(emoji =>
              emoji.id === emojiId 
                ? { ...emoji, likes_count: emoji.likes_count + 1, isLikedByUser: true } 
                : emoji
            )
          );
          console.log(`Successfully liked emoji ${emojiId}`);
        }
      }
    } catch (error) {
      console.error('Error handling like:', error);
    }
  };

  const handleDelete = async (emojiId: number) => {
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from('emojis')
        .update({ deleted: true })
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
                  className={`text-white hover:text-purple-300 ${emoji.isLikedByUser ? 'text-purple-300' : ''}`}
                  onClick={() => handleLike(emoji.id)}
                >
                  <Heart className={`h-6 w-6 ${emoji.isLikedByUser ? 'fill-current' : ''}`} />
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
