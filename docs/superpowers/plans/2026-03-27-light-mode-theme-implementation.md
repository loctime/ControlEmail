# Light Mode Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update light mode colors in `app/globals.css` to use professional gray tones and pure black text for high contrast and readability.

**Architecture:** Simple CSS variable update in the `:root` selector. No component changes needed. Dark mode (`.dark` selector) remains untouched. All changes localized to a single file.

**Tech Stack:** Tailwind CSS, CSS custom properties (HSL color format)

---

## Task 1: Update Light Mode Base Colors

**Files:**
- Modify: `app/globals.css:12-74` (`:root` selector)

- [ ] **Step 1: Open the globals.css file and review current light mode colors**

File: `app/globals.css`
Current `:root` section starts at line 12

- [ ] **Step 2: Update background color (line 13)**

Replace:
```css
--background: 210 20% 98%;
```

With:
```css
--background: 210 5% 95%;
```

- [ ] **Step 3: Update foreground color to pure black (line 14)**

Replace:
```css
--foreground: 220 20% 10%;
```

With:
```css
--foreground: 0 0% 0%;
```

- [ ] **Step 4: Update card colors (lines 15-16)**

Replace:
```css
--card: 0 0% 100%;
--card-foreground: 220 20% 10%;
```

With:
```css
--card: 210 10% 97%;
--card-foreground: 0 0% 0%;
```

- [ ] **Step 5: Update popover colors (lines 17-18)**

Replace:
```css
--popover: 0 0% 100%;
--popover-foreground: 220 20% 10%;
```

With:
```css
--popover: 210 10% 97%;
--popover-foreground: 0 0% 0%;
```

- [ ] **Step 6: Update secondary colors (lines 21-22)**

Replace:
```css
--secondary: 210 15% 93%;
--secondary-foreground: 220 20% 10%;
```

With:
```css
--secondary: 220 12% 88%;
--secondary-foreground: 0 0% 0%;
```

- [ ] **Step 7: Update accent colors (lines 25-26)**

Replace:
```css
--accent: 210 15% 93%;
--accent-foreground: 220 20% 10%;
```

With:
```css
--accent: 220 12% 88%;
--accent-foreground: 0 0% 0%;
```

- [ ] **Step 8: Update muted colors (lines 23-24)**

Replace:
```css
--muted: 210 15% 95%;
--muted-foreground: 220 10% 46%;
```

With:
```css
--muted: 220 10% 90%;
--muted-foreground: 0 0% 30%;
```

- [ ] **Step 9: Update border and input colors (lines 29-30)**

Replace:
```css
--border: 214 20% 90%;
--input: 214 20% 90%;
```

With:
```css
--border: 220 15% 85%;
--input: 220 15% 85%;
```

- [ ] **Step 10: Commit base color changes**

```bash
git add app/globals.css
git commit -m "refactor: update light mode base colors with high contrast

- Background: 210 5% 95% (grayish instead of white)
- Foreground: 0 0% 0% (pure black for readability)
- Card/Secondary/Accent: improved gray tones with better contrast
- Border/Input: darker for visibility

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Update Sidebar Light Mode Colors

**Files:**
- Modify: `app/globals.css:38-45` (sidebar colors in `:root`)

- [ ] **Step 1: Update sidebar background (line 38)**

Replace:
```css
--sidebar-background: 220 20% 10%;
```

With:
```css
--sidebar-background: 220 12% 88%;
```

- [ ] **Step 2: Update sidebar foreground to pure black (line 39)**

Replace:
```css
--sidebar-foreground: 210 15% 80%;
```

With:
```css
--sidebar-foreground: 0 0% 0%;
```

- [ ] **Step 3: Update sidebar accent (line 42)**

Replace:
```css
--sidebar-accent: 220 18% 16%;
```

With:
```css
--sidebar-accent: 220 12% 80%;
```

- [ ] **Step 4: Update sidebar accent foreground (line 43)**

Replace:
```css
--sidebar-accent-foreground: 210 15% 95%;
```

With:
```css
--sidebar-accent-foreground: 0 0% 0%;
```

- [ ] **Step 5: Update sidebar border (line 44)**

Replace:
```css
--sidebar-border: 220 15% 18%;
```

With:
```css
--sidebar-border: 220 15% 82%;
```

- [ ] **Step 6: Commit sidebar color changes**

```bash
git add app/globals.css
git commit -m "refactor: update sidebar light mode colors

- Background: 220 12% 88% (light gray for consistency)
- Foreground: 0 0% 0% (pure black text)
- Accent/Border: improved contrast for hover states

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Visual Testing in Light Mode

**Files:**
- No files modified; testing only

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Expected: Server starts on `http://localhost:3000` (or configured port)

- [ ] **Step 2: Open browser to light mode dashboard**

URL: `http://localhost:3000`
Action: Make sure light mode is active (toggle theme if needed)

- [ ] **Step 3: Visual checklist - Text Visibility**

Check these elements are clearly readable in black:
- [ ] Dashboard header text (title, page header)
- [ ] KPI card values (numbers)
- [ ] Card titles and content
- [ ] Table headers and data
- [ ] Button text
- [ ] Sidebar navigation items

Expected: All text is pure black and highly readable

- [ ] **Step 4: Visual checklist - Element Visibility**

Check these elements are clearly visible:
- [ ] Card backgrounds (subtle gray, not white)
- [ ] Input fields (borders visible, background clear)
- [ ] Borders between sections
- [ ] Dropdown menus
- [ ] Badge components
- [ ] Alert/status messages

Expected: All elements have clear visual separation

- [ ] **Step 5: Visual checklist - Sidebar**

Check sidebar in light mode:
- [ ] Navigation items readable
- [ ] Hover states visible
- [ ] Active item highlighted
- [ ] Icons visible

Expected: Sidebar has light gray background with black text

- [ ] **Step 6: Color-specific elements**

Check colored elements still work:
- [ ] Green success badges/alerts
- [ ] Red critical/error elements
- [ ] Yellow/orange warning elements
- [ ] Blue primary actions

Expected: Status colors pop against light background

---

## Task 4: Verify Contrast Compliance

**Files:**
- No files modified; testing only

- [ ] **Step 1: Check foreground vs background contrast**

Calculate WCAG contrast ratio:
- Black text (0 0% 0%) on gray background (210 5% 95%)
- Expected: ~21:1 (exceeds AAA standard of 7:1)

- [ ] **Step 2: Check card contrast**

Calculate WCAG contrast ratio:
- Black text (0 0% 0%) on card (210 10% 97%)
- Expected: ~20:1 (exceeds AAA)

- [ ] **Step 3: Check muted text contrast**

Calculate WCAG contrast ratio:
- Muted foreground (0 0% 30%) on background (210 5% 95%)
- Expected: ~10:1 (exceeds AA standard of 4.5:1)

- [ ] **Step 4: Visual verification with browser DevTools**

Open DevTools → Inspect any text element:
- Computed styles should show `--foreground` or related colors
- Black text should be unmistakable

Expected: All contrast ratios pass WCAG AA/AAA standards

---

## Task 5: Test Dark Mode Unchanged

**Files:**
- No modifications needed (dark mode untouched)

- [ ] **Step 1: Toggle to dark mode**

Click theme toggle button in UI
Action: Switch to dark mode

- [ ] **Step 2: Verify dark mode still works**

Check dark mode rendering:
- [ ] Text visible and readable
- [ ] Cards/elements clearly defined
- [ ] Colors look normal (not broken)
- [ ] No inadvertent changes

Expected: Dark mode works exactly as before

- [ ] **Step 3: Verify no CSS errors**

Open DevTools → Console tab
Expected: No red error messages

---

## Task 6: Final Verification and Commit

**Files:**
- Modified: `app/globals.css` (all changes complete)

- [ ] **Step 1: Review all changes in globals.css**

Run:
```bash
git diff app/globals.css
```

Expected: Only `:root` selector updated; `.dark` selector untouched

- [ ] **Step 2: Verify no other files need changes**

Confirmed: No component files modified (CSS-only update)

- [ ] **Step 3: Final manual check - both themes**

- Light mode: Black text, gray tones, high contrast ✓
- Dark mode: Unchanged ✓

- [ ] **Step 4: Final commit (summary)**

```bash
git log --oneline -5
```

Expected: See all 3 commits (base colors, sidebar, this summary)

- [ ] **Step 5: Push or prepare for review**

If pushing directly:
```bash
git push origin main
```

If creating PR:
```bash
git push origin main
# Create PR on GitHub
```

---

## Rollback Instructions

If issues arise, rollback is simple:

```bash
git revert HEAD~2..HEAD
# Or
git checkout HEAD~3 -- app/globals.css
```

---

## Notes

- All changes are in **CSS variables only** — no component changes
- **Dark mode completely untouched** — only `:root` modified
- **Single file modified** — minimal risk
- **High contrast** — exceeds WCAG AAA standards
- **Professional appearance** — gray tones with black text
