import { createClient } from '@supabase/supabase-js'
import { NextResponse, NextRequest } from "next/server";
import { getAuth, clerkClient } from "@clerk/nextjs/server";
import Replicate from "replicate";
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

async function ensureEmojiBucketExists() {
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

  if (bucketsError) {
    console.error("Error listing buckets:", bucketsError);
    throw new Error(`Failed to list buckets: ${bucketsError.message}`);
  }

  const emojiBucketExists = buckets.some(bucket => bucket.name === "emojis");

  if (!emojiBucketExists) {
    console.log("Creating 'emojis' bucket");
    const { data, error } = await supabase.storage.createBucket("emojis", { public: true });
    if (error) {
      console.error("Error creating 'emojis' bucket:", error);
      throw new Error(`Failed to create 'emojis' bucket: ${error.message}`);
    }
    console.log("'emojis' bucket created successfully");
  }
}

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    console.log("Starting emoji generation process");

    // Ensure the "emojis" bucket exists
    await ensureEmojiBucketExists();

    // Step 1: Get the user's information from Clerk
    const { userId } = getAuth(req);
    console.log("Clerk userId:", userId);

    if (!userId) {
      console.log("Unauthorized: No user ID found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Fetch the user's email using clerkClient
    const user = await clerkClient().users.getUser(userId);
    const primaryEmailId = user.primaryEmailAddressId;
    
    if (!primaryEmailId) {
      console.log("Unauthorized: No primary email found for user");
      return NextResponse.json({ error: "Unauthorized: No email associated with user" }, { status: 401 });
    }

    const emailAddress = await clerkClient().emailAddresses.getEmailAddress(primaryEmailId);
    const userEmail = emailAddress.emailAddress;

    console.log("User email:", userEmail);

    // Step 3: Check if user exists in profiles table, if not create a new profile
    console.log("Checking/Creating user profile");
    const { data: existingProfile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_email", userEmail)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error("Error fetching user profile:", profileError);
      return NextResponse.json({ error: `Failed to fetch user profile: ${profileError.message}` }, { status: 500 });
    }

    if (!existingProfile) {
       // Create new profile
     const { data: newProfile, error: insertError } = await supabase
     .from("profiles")
     .insert({
       user_id: userId,
       user_email: userEmail,
       credits: 3 // Default credits for new user
     })
     .select()
     .single();

      if (insertError) {
        console.error("Error creating user profile:", insertError);
        return NextResponse.json({ error: `Failed to create user profile: ${insertError.message}` }, { status: 500 });
      }
    } else if (existingProfile.user_email !== userEmail) {
      // Update email if it has changed
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ user_email: userEmail })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error updating user email:", updateError);
        return NextResponse.json({ error: `Failed to update user email: ${updateError.message}` }, { status: 500 });
      }
    }

    // Check user credits
    console.log("Checking user credits");
    const { data: profile, error: creditsError } = await supabase
      .from("profiles")
      .select("credits")
      .eq("user_email", userEmail)
      .single();

    if (creditsError) {
      console.error("Error fetching user credits:", creditsError);
      return NextResponse.json({ error: `Failed to fetch user credits: ${creditsError.message}` }, { status: 500 });
    }

    if (!profile || profile.credits < 1) {
      console.log("Insufficient credits");
      return NextResponse.json({ 
        error: "Insufficient credits", 
        message: "You don't have enough credits to generate an emoji. Please purchase more credits or come back tomorrow."
      }, { status: 200 });
    }

    // Parse request body
    console.log("Parsing request body");
    const { prompt } = await req.json();

    // Generate emoji with Replicate
    console.log("Generating emoji with Replicate");
    const input = {
      prompt: `A TOK emoji of ${prompt}`,
      apply_watermark: false
    };

    const output = await replicate.run(
      "fofr/sdxl-emoji:dee76b5afde21b0f01ed7925f0665b7e879c50ee718c5f78a9d38e04d523cc5e",
      { input }
    );

    if (!output || !Array.isArray(output) || output.length === 0) {
      console.error("Failed to generate emoji: No output from Replicate");
      return NextResponse.json({ error: "Failed to generate emoji" }, { status: 500 });
    }

    const imageUrl = output[0];
    console.log("Emoji generated successfully:", imageUrl);

    // Upload emoji to Supabase storage
    console.log("Uploading emoji to Supabase storage");
    const file = await fetch(imageUrl).then(res => res.blob());
    const fileName = `${userEmail}/${Date.now()}.png`;
    console.log("File name:", fileName);
    console.log("File size:", file.size);
    console.log("File type:", file.type);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("emojis")
      .upload(fileName, file, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error("Error uploading emoji to storage:", uploadError);
      if (uploadError.message.includes("row-level security")) {
        return NextResponse.json({ 
          error: "Permission denied", 
          message: "Unable to upload emoji due to row-level security policy. Please contact support for assistance.",
          details: uploadError.message
        }, { status: 403 });
      }
      return NextResponse.json({ error: `Failed to upload emoji: ${uploadError.message}` }, { status: 500 });
    }

    console.log("Upload data:", uploadData);

    const { data: publicUrlData } = supabase.storage
      .from("emojis")
      .getPublicUrl(uploadData.path);

    // Add emoji data to database
    console.log("Adding emoji data to database");
    const { data: emojiData, error: insertError } = await supabase
      .from("emojis")
      .insert({
        image_url: publicUrlData.publicUrl,
        prompt,
        creator_user_id: userEmail,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting emoji data:", insertError);
      return NextResponse.json({ error: `Failed to insert emoji data: ${insertError.message}` }, { status: 500 });
    }

    // Update user credits
    console.log("Updating user credits");
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ credits: profile.credits - 1 })
      .eq("user_email", userEmail);

    if (updateError) {
      console.error("Error updating user credits:", updateError);
      return NextResponse.json({ error: `Failed to update user credits: ${updateError.message}` }, { status: 500 });
    }

    console.log("Emoji generation process completed successfully");
    return NextResponse.json({ url: emojiData.image_url });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to generate emoji" }, { status: 500 });
  }
}
