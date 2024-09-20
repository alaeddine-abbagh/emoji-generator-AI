"use client"
import React from 'react';
import { useUser, UserButton } from "@clerk/nextjs";
import { Mail } from "lucide-react";

export default function Header() {
  const { user } = useUser();

  return (
    <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        <h1 className="text-2xl font-bold">Aladin&apos;s Emoji Maker</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            {user ? (
              <p className="text-sm">
                Logged in as: <span className="font-semibold">{user.primaryEmailAddress?.emailAddress}</span>
              </p>
            ) : (
              <p className="text-sm font-semibold">Not logged in</p>
            )}
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </header>
  );
}