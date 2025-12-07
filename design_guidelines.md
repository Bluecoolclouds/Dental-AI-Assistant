# Design Guidelines: Dental Health Mobile Application

## Architecture Decisions

### Authentication
**Auth Required**: Yes
- **Registration Methods**:
  - Email + password (primary)
  - Phone number + SMS verification code
- **Social Sign-In**: Not needed for medical privacy compliance
- **Account Management**:
  - Profile screen with user health data
  - Settings > Account > Delete account (double confirmation with medical data warning)
  - Log out with confirmation

### Navigation Architecture
**Root Navigation**: Tab Bar (4 tabs)
- **Tab 1**: Главная (Home) - Dashboard with health overview and next actions
- **Tab 2**: Карта (Map) - Interactive tooth map
- **Tab 3**: Анализ (Analysis) - Test and AI recommendations
- **Tab 4**: Профиль (Profile) - User profile, questionnaire, settings

**Floating Action Button**: "Пройти тест" (Take Test) - positioned above tab bar, right side

**Initial Flow**: Stack-based onboarding (5 screens) before accessing tab navigation

## Screen Specifications

### Onboarding Screens (Stack Navigation)

**Screen 1: Welcome**
- Purpose: Introduction to app capabilities
- Layout: Full-screen with illustration
- Header: None
- Content: Centered title, description, "Далее" button
- Insets: top: insets.top + 40, bottom: insets.bottom + 24

**Screen 2: Registration**
- Purpose: Create account
- Header: Back button (left), "Регистрация" title
- Layout: Scrollable form
- Components: Email/phone input toggle, password field, "Зарегистрироваться" button, "Уже есть аккаунт?" link
- Form buttons: Below form content
- Insets: bottom: insets.bottom + 24

**Screen 3: Health Questionnaire**
- Purpose: Collect oral health habits
- Header: Progress indicator (3/5), Skip button (right)
- Layout: Scrollable form with sections
- Components: Age input, checkbox groups (brushing frequency, floss/irrigator usage, braces, sensitivity)
- Submit button: Fixed at bottom
- Insets: top: 16, bottom: insets.bottom + 24

**Screen 4: Tooth Map Introduction**
- Purpose: Explain interactive map feature
- Layout: Illustration + instructions
- Header: Progress (4/5)
- Content: Visual guide, "Перейти к карте" button
- Insets: top: 16, bottom: insets.bottom + 24

**Screen 5: Medical Disclaimer**
- Purpose: Legal notice about app limitations
- Header: Progress (5/5)
- Layout: Centered content with warning icon
- Content: Disclaimer text, "Я понимаю" checkbox, "Начать" button
- Insets: top: 40, bottom: insets.bottom + 24

### Main App Screens

**Home Screen (Tab 1)**
- Purpose: Dashboard with health status overview
- Header: Transparent, "Здоровье зубов" title, Settings icon (right)
- Layout: Scrollable
- Components: 
  - Health score card (visual gauge)
  - Risk level indicator (color-coded)
  - Last assessment date
  - Quick action cards (Update Map, Retake Test)
  - AI recommendations summary
- Insets: top: headerHeight + 24, bottom: tabBarHeight + 24

**Interactive Tooth Map (Tab 2)**
- Purpose: Mark tooth problems on visual diagram
- Header: Transparent, "Карта зубов" title, Info icon (right)
- Layout: Non-scrollable, interactive canvas
- Components:
  - SVG tooth diagram (upper/lower jaw)
  - Problem type selector (floating toolbar: боль, скол, пломба, кровоточивость)
  - Legend bottom sheet
  - Save button (floating, bottom right)
- Insets: top: headerHeight + 16, bottom: tabBarHeight + 80
- Floating save button shadow: shadowOffset {width: 0, height: 2}, shadowOpacity: 0.10, shadowRadius: 2

**Analysis & Test (Tab 3)**
- Purpose: Take health assessment and view AI recommendations
- Header: Transparent, "Анализ" title
- Layout: Scrollable
- Components:
  - Current risk score card
  - "Пройти новый тест" button
  - AI recommendations section (expandable cards)
  - Recommended dentist visit frequency
  - Last updated timestamp
- Insets: top: headerHeight + 24, bottom: tabBarHeight + 24

**Profile & Settings (Tab 4)**
- Purpose: Manage user data and app preferences
- Header: Transparent, "Профиль" title
- Layout: Scrollable list
- Components:
  - User info card (name, email/phone)
  - Health questionnaire (tap to edit)
  - Feedback button (opens modal form)
  - App version
  - Account section (Log out, Delete account)
- Insets: top: headerHeight + 16, bottom: tabBarHeight + 24

### Modal Screens

**Test Flow (Modal Stack)**
- Header: Custom with progress bar, Close (X) button (right)
- Layout: Scrollable form, one question per screen
- Submit: "Далее" button fixed at bottom
- Insets: bottom: insets.bottom + 24

**AI Recommendations Detail (Modal)**
- Header: "Рекомендации ИИ" title, Close button
- Layout: Scrollable
- Content: Detailed advice categorized by topic, disclaimer footer
- Insets: top: 16, bottom: insets.bottom + 24

**Feedback Form (Modal)**
- Header: "Обратная связь" title, Close (left), Send (right)
- Layout: Scrollable form
- Components: Multi-line text input, category picker
- Insets: top: 16, bottom: insets.bottom + 24

## Design System

### Color Palette
**Medical Theme - Professional & Trustworthy**
- Primary: #4A90E2 (calm medical blue)
- Secondary: #50C878 (healthy green)
- Warning: #F5A623 (amber for moderate risk)
- Danger: #E74C3C (red for high risk)
- Background: #F8F9FA (soft white)
- Surface: #FFFFFF
- Text Primary: #2C3E50
- Text Secondary: #7F8C8D
- Border: #E1E8ED

### Typography
- Headings: System font, Semi-bold (600)
- Body: System font, Regular (400)
- Labels: System font, Medium (500)
- Sizes: 28 (H1), 20 (H2), 16 (Body), 14 (Caption), 12 (Small)

### Visual Design
- Icons: Feather icons for navigation and actions; custom tooth/medical icons for dental features
- Touchable feedback: Opacity 0.7 on press for all buttons and interactive elements
- Cards: Subtle border (1px), no shadow, 12px border radius
- Buttons: 48px height minimum, 12px border radius, solid fill for primary, outline for secondary
- Floating elements shadow: shadowOffset {width: 0, height: 2}, shadowOpacity: 0.10, shadowRadius: 2

### Critical Assets
1. **Tooth diagram SVG** - anatomically accurate upper/lower jaw with individually selectable teeth (32 teeth total)
2. **Health score gauge** - semi-circular progress indicator for dashboard
3. **Onboarding illustrations** (5 unique):
   - Welcome: tooth with protective shield
   - Registration: dental health checklist
   - Questionnaire: person brushing teeth
   - Map intro: interactive tooth diagram preview
   - Disclaimer: medical professional icon
4. **Problem type icons** (6 custom):
   - Pain (tooth with red pulse)
   - Chip (cracked tooth)
   - Filling (filled tooth)
   - Bleeding gums (gum with droplet)
   - Sensitivity (tooth with lightning)
   - Cavity (tooth with hole)

### Accessibility
- Minimum touch target: 44x44px
- Color contrast: WCAG AA compliance (4.5:1 for text)
- Russian language support throughout
- Medical disclaimer readable at 16px minimum
- Clear visual hierarchy for risk levels (green/amber/red with icons, not color-only)