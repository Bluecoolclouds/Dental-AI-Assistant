# Dental Health Mobile Application

## Overview

This is a React Native mobile application for dental health monitoring built with Expo. The app helps users track oral health through an interactive tooth map, health questionnaires, and AI-powered recommendations. Users can mark dental problems on a 32-tooth diagram, complete health assessments, and receive personalized care suggestions based on their data.

**Primary Technologies:**
- React Native (Expo SDK 55, RN 0.83.2, React 19.2.0)
- Expo SDK 55 with new architecture + React Compiler
- Express.js backend — auth, profile, test results, feedback on PostgreSQL; tooth/history/calendar/files/alerts remain local
- Anthropic Claude (claude-opus-4-5 main, claude-haiku-4-5 fast)
- expo-sqlite for local device database (all user data)
- expo-secure-store for auth token
- expo-file-system + expo-sharing for local file management
- expo-image-picker (~16.0.6) for avatar photo selection
- React Navigation (stack + bottom tabs)
- TanStack Query for AI mutation requests
- Custom local data hooks (useLocalData.ts)

## Architecture — HYBRID

**Server (PostgreSQL):** Auth (register/login with email code verification), user profiles, test results, feedback. Admin dashboard at `/admin?key=<ADMIN_SECRET>`.

**Local (SQLite on device):** Tooth data, tooth history, calendar events, alerts, files. Read-through cache for profile (synced from server on load, written to server on update). Test results and feedback are written both locally and to server (write-through).

- Auth requires email verification code (6-digit, expires in 10 min)
- Profile syncs from server on every load; local SQLite is the cache/fallback
- Files (X-rays, photos, PDFs) stored in device's document directory via expo-file-system

## Recent Changes
- **2026-03-10**: HYBRID MIGRATION — Auth moved to server PostgreSQL (with email code verification). User profiles, test results, feedback synced to server via write-through. Added admin analytics dashboard at `/admin?key=<ADMIN_SECRET>` with Chart.js (registrations chart, risk distribution, tooth problems, feedback list). Extended `userProfiles` schema with displayName/avatarUrl/birthDate/gender/goals/location/allergyToAnesthetics/seriousIllnesses. `ADMIN_SECRET` env var controls access.
- **2026-03-10**: MAJOR — Migrated to local-first architecture. All user data (calendar, files, profile, teeth, test results, alerts) now stored in local SQLite on device. Server only handles AI calls. Added `calendar_events` table + `calendarRepository.ts`. Refactored CalendarScreen, MaterialsScreen, AIChatScreen to use local storage. Modified server `/api/chat` to accept `userContext` from client (instead of fetching from server DB). Files uploaded in chat are now saved locally via expo-file-system. Added expo-sharing for file opening.
- **2026-03-09**: Added Calendar feature — `calendar_events` DB table, full CRUD API, CalendarScreen redesign with gradient header, timeline events, animated bottom sheet modal, FDI tooth numbering.
- **2026-03-09**: Upgraded to Expo SDK 55. Auth bottom sheet fixed for Android. MaterialsScreen top padding fix.
- **2026-02-24**: Design overhaul - migrated from teal (#0097A7) to blue (#4A90D9) "Toothy" theme
  - Updated color palette in constants/theme.ts
  - Redesigned WelcomeScreen with blue gradient splash, tooth illustrations, branding
  - Redesigned HomeScreen with rounded header card, gradient promo banner, colored quick actions
  - Redesigned ProfileScreen with gradient header, profile card with stats, menu with colored icons
  - Updated ToothMapScreen legend colors to match new palette
  - Tab bar icons kept consistent with original functionality

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework:** React Native with Expo SDK 54, using the new architecture and React Compiler experiments.

**Navigation Structure:**
- Root navigator switches between onboarding stack and main app based on authentication state
- Onboarding flow: 5-screen stack (Welcome → Auth → Questionnaire → ToothMapIntro → Disclaimer)
- Main app: Bottom tab navigator with 4 tabs (Home, ToothMap, Analysis, Profile)
- Modal screens: TestFlow, Feedback, AIRecommendations, ToothDetail

**State Management:**
- TanStack Query for server state and caching
- React Context for authentication state
- AsyncStorage for auth token persistence
- No global state library (Context + Query suffices for this app size)

**Design System:**
- Theme-based colors with light/dark mode support
- Consistent spacing scale (xs: 4, sm: 8, md: 12, lg: 16, xl: 24, 2xl: 32, 3xl: 40, 4xl: 48)
- Typography scale (h1-h4, body, small, link)
- Medical-themed color palette (primary blue #4A90D9, healthy green, warning amber, danger red)

**Key UI Patterns:**
- Keyboard-aware scroll views for form screens
- Animated interactions using Reanimated (button press, card interactions)
- Platform-specific blur effects on iOS (tab bar, headers)
- Safe area insets handling throughout
- Progressive onboarding with step indicators

### Backend Architecture

**Server Framework:** Express.js with TypeScript compilation

**API Structure:**
- RESTful endpoints organized by resource
- `/api/auth/*` - Registration and login
- `/api/profile/*` - User profile and questionnaire data
- `/api/tooth-data/*` - Tooth map problem tracking
- `/api/test-results/*` - Health assessment results
- `/api/recommendations` - AI-powered suggestions
- `/api/feedback` - User feedback collection

**Authentication:**
- Email + password authentication (SHA-256 hashed)
- Token stored in AsyncStorage, passed via cookies
- User session maintained through auth context
- No JWT implementation (relying on session cookies)

**CORS Configuration:**
- Dynamic origin validation using REPLIT_DEV_DOMAIN and REPLIT_DOMAINS
- Credentials enabled for cookie-based auth
- Preflight OPTIONS handling

### Data Architecture

**Database Schema (PostgreSQL via Drizzle):**

1. **users** - Authentication credentials
   - id (UUID primary key)
   - email (unique)
   - password (hashed)
   - createdAt

2. **userProfiles** - Health questionnaire data
   - userId (foreign key to users)
   - age, brushingFrequency, usesFloss, usesIrrigator
   - hasBraces, hasSensitivity, hasGumBleeding
   - onboardingCompleted, disclaimerAccepted
   - updatedAt

3. **toothData** - Tooth-specific problem tracking
   - userId (foreign key)
   - toothNumber (1-32 numbering system)
   - problems (JSONB array of problem types)
   - notes (text)
   - updatedAt

4. **testResults** - Health assessment scores
   - userId (foreign key)
   - teethScore, gumsScore, overallScore
   - teethRisk, gumsRisk (low/moderate/high)
   - answers (JSONB)
   - createdAt

5. **feedback** - User feedback collection
   - userId (foreign key)
   - category (bug/feature/other)
   - message
   - createdAt

**Problem Types:** Defined as const array: pain, chip, filling, bleeding, sensitivity, cavity

**Data Flow:**
- Client queries use TanStack Query with `/api/*` endpoints as query keys
- Mutations invalidate related queries for automatic UI updates
- Storage layer abstracts database operations with IStorage interface
- Drizzle ORM handles SQL generation and type safety

### External Dependencies

**OpenAI Integration:**
- GPT model for generating personalized dental care recommendations
- Input: user profile, tooth problems, test results
- Output: structured recommendations by category (brushing, flossing, diet, visits, products, habits)
- API key required via OPENAI_API_KEY environment variable
- Graceful degradation if API key not configured

**Third-Party Services:**
- PostgreSQL database (provisioned via DATABASE_URL)
- Expo services (fonts, splash screen, linking, web browser)
- Async Storage for client-side persistence

**Key Libraries:**
- React Navigation (v7) - Native stack and bottom tabs
- React Native Reanimated (v4) - Smooth animations
- React Native Gesture Handler - Touch interactions
- React Native Keyboard Controller - Keyboard handling
- Expo Blur - iOS blur effects
- Expo Haptics - Tactile feedback
- Zod - Runtime validation and schema generation

**Development Environment:**
- Replit-specific domain configuration for Expo dev server
- Proxy setup for API requests during development
- Static build process for production deployment