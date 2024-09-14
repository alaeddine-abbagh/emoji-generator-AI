"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface Emoji {
  id: string;
  url: string;
  prompt: string;
  liked: boolean;
  likes: number;
}

interface EmojiContextType {
  emojis: Emoji[];
  addEmoji: (emoji: Omit<Emoji, "liked" | "likes">) => void;
  toggleLike: (id: string) => void;
}

const EmojiContext = createContext<EmojiContextType | undefined>(undefined);

export const EmojiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [emojis, setEmojis] = useState<Emoji[]>([]);

  useEffect(() => {
    // Load emojis from local storage when the component mounts
    const storedEmojis = localStorage.getItem('emojis');
    if (storedEmojis) {
      setEmojis(JSON.parse(storedEmojis));
    }
  }, []);

  useEffect(() => {
    // Save emojis to local storage whenever the emojis state changes
    if (emojis.length > 0) {
      localStorage.setItem('emojis', JSON.stringify(emojis));
    }
  }, [emojis]);

  const addEmoji = (newEmoji: Omit<Emoji, "liked" | "likes">) => {
    setEmojis(prevEmojis => {
      const updatedEmojis = [...prevEmojis, { ...newEmoji, liked: false, likes: 0 }];
      localStorage.setItem('emojis', JSON.stringify(updatedEmojis));
      return updatedEmojis;
    });
  };

  const toggleLike = (id: string) => {
    setEmojis(prevEmojis => {
      const updatedEmojis = prevEmojis.map(emoji =>
        emoji.id === id
          ? { ...emoji, liked: !emoji.liked, likes: emoji.liked ? emoji.likes - 1 : emoji.likes + 1 }
          : emoji
      );
      localStorage.setItem('emojis', JSON.stringify(updatedEmojis));
      return updatedEmojis;
    });
  };

  return (
    <EmojiContext.Provider value={{ emojis, addEmoji, toggleLike }}>
      {children}
    </EmojiContext.Provider>
  );
};

export const useEmoji = () => {
  const context = useContext(EmojiContext);
  if (context === undefined) {
    throw new Error("useEmoji must be used within an EmojiProvider");
  }
  return context;
};