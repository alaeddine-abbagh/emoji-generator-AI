"use client"

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function UserProfileInitializer() {
  const { user } = useUser();
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function createOrUpdateUser() {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .upsert({
            user_id: user.id,
            // Add any other fields you want to set or update
          })
          .select();

        if (error) {
          console.error('Error creating/updating user profile:', error);
        } else {
          console.log('User profile created/updated:', data);
        }
      }
    }

    createOrUpdateUser();
  }, [user, supabase]);

  return null; // This component doesn't render anything
}
