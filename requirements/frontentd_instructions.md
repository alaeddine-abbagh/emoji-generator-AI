# Project Overview 
Use this guide to build a wen app where users can give a text prompt to generate emoji using model hosted on Replicate 
Here is what each script is doing: 
app/page.tsx:
This is the main page component of the application. It sets up the overall layout and includes the EmojiGenerator and EmojiGrid components. It also wraps everything in the EmojiProvider to provide context to all child components.

app/contexts/emoji-context.tsx:
This file sets up the React context for managing emoji state across the application. It provides functions to add emojis and toggle likes, and also handles local storage to persist emojis between sessions.

app/components/emoji-generator.tsx:
This component handles the user interface for generating new emojis. It includes an input field for the user to enter a prompt and a button to generate the emoji. When the form is submitted, it calls the API to generate a new emoji and adds it to the context.

app/components/emoji-grid.tsx:
This component displays all the generated emojis in a grid format. It reads the emojis from the context and renders them, including functionality for liking emojis.

app/api/generate-emoji/route.ts:
This is the API route that handles the actual generation of emojis. It receives the prompt from the frontend, calls the Replicate API to generate the emoji, and returns the result.

Here's a brief overview of how these components work together:

The main page (page.tsx) sets up the layout and includes the necessary components.
When a user enters a prompt and clicks "Generate Emoji" in the EmojiGenerator component, it sends a request to the API route.
The API route processes the request and returns the generated emoji URL.
The EmojiGenerator component then adds this new emoji to the context.
The EmojiGrid component, which is listening to the context, updates to display the new emoji.
All emojis are stored in local storage, so they persist even when the page is refreshed.

# Feature requirements 
- We will use Next.js, shadcn Lucid, Supabase, Clerk 


# Relevant Docs


# Current file structure 

EMOJI-MAKER/
├── .next/
├── app/
│   ├── api/
│   ├── components/
│   ├── contexts/
│   ├── fonts/
│   ├── (components)/ui/
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── input.tsx
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   └── utils.ts
├── node_modules/
├── public/
├── requirements/
│   └── frontend_instructions.md
├── .env.local
├── .eslintrc.json
├── .gitignore
├── components.json
├── next-env.d.ts
├── next.config.mjs
├── package-lock.json
├── package.json
├── postcss.config.js
├── README.md
├── tailwind.config.ts
└── tsconfig.json
# Ruls
- All new components should go  in /components and be named like exmaple-component.tsx unless otherwise specified
- All new pages go in /app 



  You are an expert in Solidity, TypeScript, Node.js, Next.js 14 App Router, React, Vite, Viem v2, Wagmi v2, Shadcn UI, Radix UI, and Tailwind Aria.
  
  Key Principles
  - Write concise, technical responses with accurate TypeScript examples.
  - Use functional, declarative programming. Avoid classes.
  - Prefer iteration and modularization over duplication.
  - Use descriptive variable names with auxiliary verbs (e.g., isLoading).
  - Use lowercase with dashes for directories (e.g., components/auth-wizard).
  - Favor named exports for components.
  - Use the Receive an Object, Return an Object (RORO) pattern.
  
  JavaScript/TypeScript
  - Use "function" keyword for pure functions. Omit semicolons.
  - Use TypeScript for all code. Prefer interfaces over types. Avoid enums, use maps.
  - File structure: Exported component, subcomponents, helpers, static content, types.
  - Avoid unnecessary curly braces in conditional statements.
  - For single-line statements in conditionals, omit curly braces.
  - Use concise, one-line syntax for simple conditional statements (e.g., if (condition) doSomething()).
  
  Error Handling and Validation
  - Prioritize error handling and edge cases:
    - Handle errors and edge cases at the beginning of functions.
    - Use early returns for error conditions to avoid deeply nested if statements.
    - Place the happy path last in the function for improved readability.
    - Avoid unnecessary else statements; use if-return pattern instead.
    - Use guard clauses to handle preconditions and invalid states early.
    - Implement proper error logging and user-friendly error messages.
    - Consider using custom error types or error factories for consistent error handling.
  
  React/Next.js
  - Use functional components and TypeScript interfaces.
  - Use declarative JSX.
  - Use function, not const, for components.
  - Use Shadcn UI, Radix, and Tailwind Aria for components and styling.
  - Implement responsive design with Tailwind CSS.
  - Use mobile-first approach for responsive design.
  - Place static content and interfaces at file end.
  - Use content variables for static content outside render functions.
  - Minimize 'use client', 'useEffect', and 'setState'. Favor RSC.
  - Use Zod for form validation.
  - Wrap client components in Suspense with fallback.
  - Use dynamic loading for non-critical components.
  - Optimize images: WebP format, size data, lazy loading.
  - Model expected errors as return values: Avoid using try/catch for expected errors in Server Actions. Use useActionState to manage these errors and return them to the client.
  - Use error boundaries for unexpected errors: Implement error boundaries using error.tsx and global-error.tsx files to handle unexpected errors and provide a fallback UI.
  - Use useActionState with react-hook-form for form validation.
  - Code in services/ dir always throw user-friendly errors that tanStackQuery can catch and show to the user.
  - Use next-safe-action for all server actions:
    - Implement type-safe server actions with proper validation.
    - Utilize the `action` function from next-safe-action for creating actions.
    - Define input schemas using Zod for robust type checking and validation.
    - Handle errors gracefully and return appropriate responses.
    - Use import type { ActionResponse } from '@/types/actions'
    - Ensure all server actions return the ActionResponse type
    - Implement consistent error handling and success responses using ActionResponse
  
  Key Conventions
  1. Rely on Next.js App Router for state changes.
  2. Prioritize Web Vitals (LCP, CLS, FID).
  3. Minimize 'use client' usage:
     - Prefer server components and Next.js SSR features.
     - Use 'use client' only for Web API access in small components.
     - Avoid using 'use client' for data fetching or state management.
  
  Refer to Next.js documentation for Data Fetching, Rendering, and Routing best practices.
  