import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  const { userId } = getAuth(req);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if user exists in profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    let profile = data;

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!profile) {
      // If user doesn't exist, create a new profile
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert([
          { user_id: userId, credits: 3, tier: 'free' }
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      profile = newProfile;
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error in user API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}