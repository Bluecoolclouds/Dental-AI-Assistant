# Design Guidelines: Dentcor-style Dental Health Mobile Application

## Architecture Decisions

### Authentication
**Auth Required**: Yes
- **Registration Methods**:
  - Email + password (primary)
- **Social Sign-In**: Not needed for medical privacy compliance
- **Account Management**:
  - Profile screen with user health data
  - Log out with confirmation

### Navigation Architecture
**Root Navigation**: Tab Bar (4 tabs with liquid glass effect)
- **Tab 1**: Home - Dashboard with greeting, services, doctors
- **Tab 2**: Карта (Map) - Interactive dental arch view
- **Tab 3**: Анализ (Analysis) - Test and AI recommendations
- **Tab 4**: Профиль (Profile) - User profile settings

**Initial Flow**: Stack-based onboarding with Registration as entry point

## Screen Specifications

### Registration Screen (Entry Point)
- Purpose: Create account with beautiful dental-themed design
- Layout: Full-screen with gradient background (teal to light blue)
- Components:
  - App logo and name at top
  - Decorative 3D tooth illustrations
  - "Book Now" style call-to-action
  - Registration form overlay
- Design Style: Dentcor-inspired with rounded corners and soft shadows

### Home Screen (Main Dashboard)
- Purpose: Welcoming dashboard like Dentcor
- Header: User avatar with greeting ("Hello, [Name]"), notification bell
- Layout: Scrollable, white background
- Components: 
  - Special offer banner with dental illustration
  - "Our Services" horizontal scroll (Scaling, Braces, Crown, etc.)
  - "Available Doctor" section with doctor cards
  - Rating stars and distance info
- Design: Clean white cards with subtle shadows

### Tooth Map Screen (Dental Arch)
- Purpose: Interactive dental arch view like Dentcor's "Your Medical Record"
- Header: Back button, "Your Medical Record" title
- Layout: Centered dental arch diagram
- Components:
  - Upper Dental Arch (16 teeth in arch shape)
  - Lower Dental Arch (16 teeth in arch shape)
  - Legend: "Has Treatment Before" (green), "Recommended To Be Treated" (blue)
  - Clickable individual teeth with color indicators
- Design: Realistic arch layout matching dental anatomy

## Design System

### Color Palette
**Dentcor Theme - Modern & Fresh**
- Primary: #0097A7 (teal/cyan)
- Primary Light: #00ACC1 (light teal)
- Accent: #2196F3 (blue for highlights)
- Success: #4CAF50 (healthy green - has treatment)
- Warning: #FF9800 (amber for attention)
- Danger: #F44336 (red for urgent)
- Background Root: #E8F4F8 (soft blue-gray)
- Surface: #FFFFFF (pure white cards)
- Text Primary: #1A1A2E (dark navy)
- Text Secondary: #64748B (muted gray)
- Border: #E2E8F0 (light gray)
- Card Shadow: rgba(0, 151, 167, 0.08)

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