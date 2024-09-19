#Database Structure:
##Supabase storage Bucket: "emojis"
##Tables:
###emoji_likes: 
id:BIGINT PRIMARY KEY, auto-generated
user_id: TEXT NOT NULL ( the user who liked the emoji)
emoji_id: BIGINT NOT NULL REFERENCES emojis(id)
created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
prompt: TEXT (same used prompt from the emojis table)

the goal of this table is to track which user likes which emoji, if the user
likes a liked emoji again, the like is removed. 
###emojis

id: BIGINT PRIMARY KEY, auto-generated
image_url: TEXT NOT NULL
prompt: TEXT NOT NULL
likes_count: NUMERIC DEFAULT 0 ( total number of likes for the emoji)
creator_user_id: TEXT NOT NULL
created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
deleted : boolean DEFAULT FALSE


###profiles

user_id: TEXT PRIMARY KEY
credits: INTEGER DEFAULT 3 NOT NULL
tier: TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro'))
stripe_customer_id: TEXT
stripe_subscription_id: TEXT
created_at: TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
updated_at: TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
user_email:TEXT NOT NULL (Primary key)




#Create user to user table:

After a user signs in via Clerk, get the userId and email from Clerk.
Check if this userId exists in the 'profiles' table.
If the user doesn't exist, create a new user in the 'profiles' table.
If the user exists, proceed and pass the user_id to functions like generate emojis.


#Upload emoji to "emojis" Supabase storage bucket:

When a user generates an emoji, upload the emoji image file returned from Replicate to the Supabase "emojis" storage bucket.
Add a row to the 'emojis' table with the image URL and creator_user_id.


#Display all images in emojigrid:

Emoji grid should fetch and display all images from the "emojis" data table, that are not marked as deleted.
When a new emoji is generated, the emojigrid should be updated automatically to add the new emoji to the top left of to the grid.


#Likes interaction:

When a user clicks the 'like' button, the num_likes should increase on the 'emojis' table and a new line is created in the emoji_likes table.
If the user clicks 'like' on an emoji they've already liked, remove the corresponding entry from the emoji_likes table and decrease the likes_count in the emojis table.
