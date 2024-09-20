"use client";

import Image from "next/image";
import { Heart, Download, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useEffect, useState, useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useUser } from "@clerk/nextjs";
import { toast } from "react-hot-toast";


// Define the structure of an Emoji object
interface Emoji {
  id: number;
  image_url: string;
  prompt: string;
  likes_count: number;
  creator_user_id: string;
  is_liked_by_user: boolean;
  deleted: boolean;
}

// Define the props for the EmojiGrid component
interface EmojiGridProps {
  emojis: Emoji[];
  isLoading: boolean;
}

// The main EmojiGrid component
const EmojiGrid: React.FC<EmojiGridProps> = ({ emojis, isLoading }) => {
  // State to store all emojis
  const [currentEmojis, setCurrentEmojis] = useState<Emoji[]>([]);
  
  // State to show loading indicator
  const [isCurrentLoading, setIsCurrentLoading] = useState(true);
  
  // Get the current user's information
  const { user } = useUser();
  
  // Create a Supabase client for database operations
  const supabase = createClientComponentClient();

  // Function to fetch all emojis
  const fetchEmojis = useCallback(async () => {
    setIsCurrentLoading(true);
    try {
      let query = supabase
        .from('emojis')
        .select('*')
        .order('created_at', { ascending: false });

      // Only filter out deleted emojis for non-admin users
      if (user?.primaryEmailAddress?.emailAddress !== 'blodrena1@gmail.com') {
        query = query.eq('deleted', false);
      }

      const { data: emojisData, error: emojisError } = await query;

      if (emojisError) throw emojisError;

      // Fetch user likes if a user is logged in
      let userLikes: number[] = [];
      if (user) {
        const { data: likesData, error: likesError } = await supabase
          .from('emoji_likes')
          .select('emoji_id')
          .eq('user_id', user.id);

        if (likesError) throw likesError;
        userLikes = likesData.map(like => like.emoji_id);
      }

      // Combine emoji data with user likes
      const processedEmojis = emojisData
        .filter(emoji => emoji.image_url && emoji.image_url.startsWith('http'))
        .map(emoji => ({
          ...emoji,
          is_liked_by_user: userLikes.includes(emoji.id)
        }));

      setCurrentEmojis(processedEmojis);
    } catch (error) {
      console.error('Error fetching emojis:', error);
      toast.error("Failed to load emojis. Please try again.");
    } finally {
      setIsCurrentLoading(false);
    }
  }, [user, supabase]);

  // This effect runs when the component mounts or when the user changes
  useEffect(() => {
    fetchEmojis();
  }, [fetchEmojis]);

  // Function to handle liking/unliking an emoji
  const toggleLike = async (emojiId: number) => {
    if (!user) {
      toast.error("Please log in to like emojis.");
      return;
    }

    try {
      const emoji = currentEmojis.find(e => e.id === emojiId);
      if (!emoji) return;

      const isLiked = emoji.is_liked_by_user;
      const newLikesCount = emoji.likes_count + (isLiked ? -1 : 1);

      // Update the emoji_likes table
      if (isLiked) {
        await supabase
          .from('emoji_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('emoji_id', emojiId);
      } else {
        await supabase
          .from('emoji_likes')
          .insert({ user_id: user.id, emoji_id: emojiId });
      }

      // Update the emojis table
      await supabase
        .from('emojis')
        .update({ likes_count: newLikesCount })
        .eq('id', emojiId);

      // Update local state
      setCurrentEmojis(currentEmojis.map(e =>
        e.id === emojiId
          ? { ...e, likes_count: newLikesCount, is_liked_by_user: !isLiked }
          : e
      ));

      toast.success(isLiked ? "Emoji unliked!" : "Emoji liked!");
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error("An error occurred. Please try again.");
    }
  };

  // Function to handle downloading an emoji
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
      toast.error("Failed to download emoji. Please try again.");
    }
  };

  // Function to handle deleting an emoji
  const handleDelete = async (emojiId: number) => {
    if (!user || user.primaryEmailAddress?.emailAddress !== 'blodrena1@gmail.com') {
      toast.error("You don't have permission to delete emojis.");
      return;
    }

    try {
      const { error } = await supabase
        .from('emojis')
        .update({ deleted: true })
        .eq('id', emojiId);

      if (error) throw error;

      // Update the local state to reflect the deletion
      setCurrentEmojis(currentEmojis.map(e =>
        e.id === emojiId ? { ...e, deleted: true } : e
      ));

      toast.success("Emoji marked as deleted successfully.");
    } catch (error) {
      console.error('Error deleting emoji:', error);
      toast.error("Failed to delete emoji. Please try again.");
    }
  };

  // Show loading indicator while data is being fetched
  if (isCurrentLoading) {
    return <div>Loading emojis...</div>;
  }

  // Render the emoji grid
  return (
    <div className="mt-8">
     
      {currentEmojis.length === 0 ? (
        <p className="text-center text-gray-500">No emojis generated yet. Create your first emoji!</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {currentEmojis.map((emoji) => (
            <div key={emoji.id} className="relative group">
              {emoji.image_url && (
                <Image
                  src={emoji.image_url}
                  alt={`Generated Emoji: ${emoji.prompt}`}
                  width={200}
                  height={200}
                  className={`w-full h-auto rounded-lg shadow-md transition-transform group-hover:scale-105 ${emoji.deleted ? 'opacity-50' : ''}`}
                  onError={() => {
                    console.error(`Error loading image: ${emoji.image_url}`);
                  }}
                />
              )}
              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white hover:text-purple-300"
                  onClick={() => toggleLike(emoji.id)}
                >
                  <Heart className={`h-6 w-6 ${emoji.is_liked_by_user ? 'fill-current text-red-500' : ''}`} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white hover:text-purple-300"
                  onClick={() => handleDownload(emoji.image_url, emoji.prompt)}
                >
                  <Download className="h-6 w-6" />
                </Button>
                {user?.primaryEmailAddress?.emailAddress === 'blodrena1@gmail.com' && (
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
              {emoji.deleted && (
                <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-sm">
                  Deleted
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default EmojiGrid;
