# AI Rules for New Grid Distribuidora Proposal Generator

This document outlines the core technologies and guidelines for library usage within this application.

## Tech Stack Overview:

*   **Frontend Framework:** React
*   **Language:** TypeScript
*   **Routing:** React Router
*   **Styling:** Tailwind CSS
*   **UI Components:** shadcn/ui (built on Radix UI)
*   **Icons:** lucide-react
*   **Backend/Database/Auth:** Supabase
*   **Package Manager:** npm

## Library Usage Rules:

*   **UI Components:** Always prioritize `shadcn/ui` components for building the user interface. If a specific component is not available in `shadcn/ui`, create a new custom component using Tailwind CSS. Do not modify existing `shadcn/ui` component files directly.
*   **Styling:** Use Tailwind CSS exclusively for all styling. Avoid inline styles or other CSS methodologies.
*   **Icons:** Use icons from the `lucide-react` library.
*   **State Management:** For simple local component state, use React's built-in `useState` and `useReducer` hooks. For global state or more complex data fetching, consider React Query or similar if needed (to be discussed and approved).
*   **Backend Interactions:** All database, authentication, and server-side logic should be handled through Supabase. Use the provided Supabase client (`src/integrations/supabase/client.ts`) for all interactions.
*   **Routing:** Use React Router for all client-side navigation. Keep route definitions centralized in `src/App.tsx`.
*   **Utility Functions:** Create small, focused utility files (e.g., `src/utils/toast.ts`) for reusable logic.
*   **New Components:** Every new component or hook must reside in its own file within `src/components/` or `src/hooks/` respectively. Avoid adding new components to existing files.