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
  isLikedByUser: boolean;
}

export default function EmojiGrid() {
  const [emojis, setEmojis] = useState<Emoji[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUser();
  const isAdmin = user?.primaryEmailAddress?.emailAddress === 'blodrena1@gmail.com';
  const { emojis: contextEmojis, addEmoji } = useEmoji();

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        await fetchEmojisWithLikes();
      } else {
        await fetchEmojisWithoutLikes();
      }
    };

    fetchData();

    const channel = supabase
      .channel('public:emojis_and_likes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emojis' }, handleEmojiChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emoji_likes' }, handleLikeChange)
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
  }, [contextEmojis, user]);

  const fetchEmojisWithLikes = async () => {
    try {
      const { data: allEmojis, error: allEmojisError } = await supabase
        .from('emojis')
        .select(`
          *,
          likes_count: emoji_likes(count)
        `)
        .eq('deleted', false)
        .order('created_at', { ascending: false });

      if (allEmojisError) throw allEmojisError;

      let userLikes: number[] = [];
      if (user) {
        const { data: userLikesData, error: userLikesError } = await supabase
          .from('emoji_likes')
          .select('emoji_id')
          .eq('user_id', user.id);

        if (userLikesError) throw userLikesError;
        userLikes = userLikesData.map(like => like.emoji_id);
      }

      const emojisWithLikes = allEmojis.map(emoji => ({
        ...emoji,
        likes_count: emoji.likes_count[0]?.count || 0,
        isLikedByUser: user ? userLikes.includes(emoji.id) : false
      }));

      setEmojis(emojisWithLikes);
      console.log('Emojis with likes fetched:', emojisWithLikes);
    } catch (error) {
      console.error('Error fetching emojis with likes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmojisWithoutLikes = async () => {
    try {
      const { data, error } = await supabase
        .from('emojis')
        .select(`
          *,
          likes_count: emoji_likes(count)
        `)
        .eq('deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const emojisWithLikes = data.map(emoji => ({
        ...emoji,
        likes_count: emoji.likes_count[0]?.count || 0,
        isLikedByUser: false
      }));

      setEmojis(emojisWithLikes);
    } catch (error) {
      console.error('Error fetching emojis without likes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmojiChange = (payload: any) => {
    if (payload.eventType === 'INSERT' && !(payload.new as Emoji).deleted) {
      setEmojis(currentEmojis => [{ ...payload.new, likes_count: 0, isLikedByUser: false } as Emoji, ...currentEmojis]);
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
  };

  const handleLikeChange = async (payload: any) => {
    const emojiId = payload.new?.emoji_id || payload.old?.emoji_id;
    await fetchEmojisWithLikes();
  };

  const handleLike = async (emojiId: number) => {
    if (!user) return;

    try {
      console.log(`Attempting to like/unlike emoji ${emojiId}`);
      const emoji = emojis.find(e => e.id === emojiId);
      if (!emoji) return;

      const isLiked = emoji.isLikedByUser;

      // Optimistically update local state
      setEmojis(prevEmojis =>
        prevEmojis.map(e =>
          e.id === emojiId
            ? {
                ...e,
                likes_count: isLiked ? Math.max(0, e.likes_count - 1) : e.likes_count + 1,
                isLikedByUser: !isLiked
              }
            : e
        )
      );

      if (isLiked) {
        // Unlike
        const { error: deleteError } = await supabase
          .from('emoji_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('emoji_id', emojiId);

        if (deleteError) throw deleteError;
        console.log(`Successfully unliked emoji ${emojiId}`);
      } else {
        // Like
        const { data, error } = await supabase
          .from('emoji_likes')
          .upsert({ user_id: user.id, emoji_id: emojiId }, { onConflict: 'user_id,emoji_id' })
          .select();

        if (error) throw error;
        if (data && data.length > 0) {
          console.log(`Successfully liked emoji ${emojiId}`);
        }
      }

      // Fetch the updated emoji data
      await fetchEmojisWithLikes();

    } catch (error) {
      console.error('Error handling like:', error);
      // Revert local state if there's an error
      await fetchEmojisWithLikes();
    }
  };

  const handleDelete = async (emojiId: number, imageUrl: string) => {
    if (!isAdmin) return;

    try {
      // Delete from emoji_likes table
      const { error: likesError } = await supabase
        .from('emoji_likes')
        .delete()
        .eq('emoji_id', emojiId);

      if (likesError) throw likesError;

      // Delete from emojis table
      const { error: emojiError } = await supabase
        .from('emojis')
        .delete()
        .eq('id', emojiId);

      if (emojiError) throw emojiError;

      // Delete from storage
      const imagePath = imageUrl.replace(supabase.supabaseUrl + '/storage/v1/object/public/', '');
      const { error: storageError } = await supabase.storage
        .from('emojis')
        .remove([imagePath]);

      if (storageError) throw storageError;

      console.log('Emoji deleted successfully');

      // Update local state
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
                    onClick={() => handleDelete(emoji.id, emoji.image_url)}
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
