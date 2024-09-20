# Emoji Maker

Emoji Maker is a web application that allows users to generate custom emojis using AI. Users can input a description, and the application will create a unique emoji based on that input.

## Project Structure

### `app/page.tsx`

This is the main page component of the application. It handles:
- State management for emojis
- Fetching emojis from the database
- Rendering the EmojiGenerator and EmojiGrid components
- Updating the emoji list when a new emoji is created

### `app/layout.tsx`

This is the root layout component. It:
- Sets up the Clerk authentication provider
- Applies global styles and fonts
- Renders the Header component and main content
- Handles signed-in and signed-out states

### `app/components/emoji-generator.tsx`

This component is responsible for:
- Rendering the emoji generation form
- Handling form submission
- Making API calls to generate new emojis
- Updating the parent component when a new emoji is created

### `app/api/generate-emoji/route.ts`

This is the API route for generating emojis. It:
- Authenticates the user using Clerk
- Checks and manages user credits
- Generates an emoji using the Replicate API
- Uploads the generated emoji to Supabase storage
- Saves emoji data to the database
- Updates user credits after successful generation

### `components/ui/input.tsx`

This is a reusable Input component used in the emoji generation form.

## Key Features

1. **User Authentication**: Uses Clerk for user authentication and management.
2. **Emoji Generation**: Utilizes the Replicate API to generate custom emojis based on user input.
3. **Database Integration**: Uses Supabase for storing emoji data and user profiles.
4. **Credit System**: Implements a credit system to limit emoji generation.
5. **Real-time Updates**: Newly generated emojis appear immediately without page refresh.

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables:
   - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
   - NEXT_PUBLIC_SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - REPLICATE_API_TOKEN
4. Run the development server: `npm run dev`

## Development Notes

- The project uses Next.js with TypeScript for type safety.
- State management is handled using React hooks (useState, useEffect, useCallback).
- API routes are implemented using Next.js API routes.
- The UI is styled using Tailwind CSS.

When working on this project, pay attention to:
- User authentication flow with Clerk
- Credit management for users
- Error handling in the emoji generation process
- Real-time updates of the emoji grid after generation
