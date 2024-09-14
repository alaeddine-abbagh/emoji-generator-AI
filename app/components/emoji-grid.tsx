"use client";

import Image from "next/image";
import { Heart, Share2 } from "lucide-react";
import { useEmoji } from "../contexts/emoji-context";
import { Button } from "../../components/ui/button";
import { useEffect, useState } from "react";

export default function EmojiGrid() {
  const { emojis, toggleLike } = useEmoji();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
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
                src={emoji.url}
                alt={`Generated Emoji: ${emoji.prompt}`}
                width={200}
                height={200}
                className="w-full h-auto rounded-lg shadow-md transition-transform group-hover:scale-105"
                onError={(e) => {
                  console.error(`Error loading image: ${emoji.url}`);
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
                  <Heart className={`h-6 w-6 ${emoji.liked ? 'fill-current text-red-500' : ''}`} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white hover:text-purple-300"
                  onClick={() => {
                    // Implement share functionality
                    console.log('Share emoji:', emoji);
                  }}
                >
                  <Share2 className="h-6 w-6" />
                </Button>
              </div>
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded-md text-sm">
                {emoji.likes} {emoji.likes === 1 ? 'like' : 'likes'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}