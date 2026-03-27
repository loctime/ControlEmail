# Light Mode Theme Redesign - Design Spec

**Date:** 2026-03-27
**Status:** Pending Review
**Author:** Claude

## Problem Statement

The light mode theme has insufficient contrast and visibility. Key issues:
- Background colors too close to foreground colors (both very light)
- Text and UI elements are nearly invisible without explicit colors
- Borders and secondary elements lack definition
- Fails WCAG contrast requirements

## Solution Overview

Redesign the light mode color palette in `app/globals.css` to use professional gray tones with strong contrast. All elements will be readable without relying on colored text alone.

## Color Palette - Light Mode

### Base Colors
| Variable | Current | New | Rationale |
|----------|---------|-----|-----------|
| `--background` | `210 20% 98%` | `210 5% 95%` | Grayish background instead of pure white—slightly darker for contrast |
| `--foreground` | `220 20% 10%` | `0 0% 0%` | Pure black text for maximum readability |
| `--card` | `0 0% 100%` | `210 10% 97%` | Subtle gray tint on cards, higher contrast |
| `--popover` | `0 0% 100%` | `210 10% 97%` | Matches card styling |
| `--secondary` | `210 15% 93%` | `220 12% 88%` | Darker secondary elements |
| `--muted` | `210 15% 95%` | `220 10% 90%` | Muted text more legible |
| `--accent` | `210 15% 93%` | `220 12% 88%` | Better definition |
| `--border` | `214 20% 90%` | `220 15% 85%` | Visible borders throughout |
| `--input` | `214 20% 90%` | `220 15% 85%` | Input fields clearly visible |

### Accent & Status Colors (unchanged)
- Primary, secondary foreground, destructive, success, warning, chart colors remain the same
- These already have good contrast in light mode

### Sidebar (Light Mode)
| Variable | Current | New |
|----------|---------|-----|
| `--sidebar-background` | `220 20% 10%` | `220 12% 88%` | Light gray instead of dark (sidebar is light mode too) |
| `--sidebar-foreground` | `210 15% 80%` | `0 0% 0%` | Black text on light sidebar |
| `--sidebar-primary` | `215 90% 55%` | `215 90% 55%` | Keep bright blue for active states |
| `--sidebar-accent` | `220 18% 16%` | `220 12% 80%` | Light gray for hover states |
| `--sidebar-border` | `220 15% 18%` | `220 15% 82%` | Visible borders |

### Shadow Adjustments
Light mode shadows should be more subtle (already defined correctly)

## Implementation Details

**File to modify:** `app/globals.css`
- Update `:root` selector color definitions (light mode)
- Do NOT modify `.dark` selector (dark mode stays unchanged)
- Verify sidebar colors are consistent
- Test all status colors (success, warning, critical, etc)

**Testing Requirements:**
- Visual check: All text readable without color cues alone
- Contrast check: WCAG AA standard (4.5:1 for normal text, 3:1 for UI components)
- Component check: Cards, buttons, inputs, badges, alerts all clearly visible
- Sidebar check: Navigation items readable, hover states clear

## No Changes to Dark Mode

The dark mode (`.dark` selector) remains unchanged—it already has good contrast.

## Success Criteria

✓ All text is readable in light mode without relying on colored text
✓ Cards, borders, and secondary elements are clearly visible
✓ WCAG AA contrast ratio achieved
✓ Professional appearance with gray tones
✓ Dark mode unaffected
✓ No component changes needed (CSS-only fix)

## Rollout

Single commit updating `app/globals.css` with new color values. No breaking changes.
