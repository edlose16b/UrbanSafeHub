# Design System Document

## 1. Overview & Creative North Star: "The Vigilant Sentinel"

The Creative North Star for this design system is **The Vigilant Sentinel**. In a world of cluttered data, this system acts as a high-end, editorial lens that brings clarity to community safety. We move beyond the "standard dashboard" by utilizing a sophisticated, atmospheric dark-mode aesthetic.

The design rejects the rigid, "boxed-in" feel of traditional map applications. Instead, we embrace **intentional asymmetry, depth through luminosity, and tonal layering**. By using high-contrast typography scales and overlapping translucent surfaces, we create a UI that feels like a premium, data-driven instrument—professional, authoritative, and deeply intuitive.

---

## 2. Colors & Atmospheric Depth

Our palette is rooted in a deep-space `surface` (#131313), allowing our safety heatmaps to vibrate with importance.

### The "No-Line" Rule

**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section content. Boundaries must be defined solely through background color shifts. For example, a `surface-container-low` (#1C1B1B) card sitting on a `surface` (#131313) base creates a sophisticated edge without the visual noise of a line.

### Surface Hierarchy & Nesting

Treat the UI as a series of physical layers—like stacked sheets of obsidian glass.

- **Base Layer:** `surface` (#131313) - The map background.
- **Secondary Layer:** `surface-container-low` (#1C1B1B) - Main side panels or navigation anchors.
- **Tertiary Layer:** `surface-container-high` (#2A2A2A) - Active cards or elevated tooltips.
- **Top Layer:** `surface-bright` (#393939) - Search bars or high-interaction floating elements.

### The "Glass & Gradient" Rule

To achieve a "Signature" feel, use **Glassmorphism** for floating map overlays. Use `surface-container` with a 70% opacity and a `20px` backdrop-blur.

- **Signature Textures:** For primary actions, use a subtle linear gradient from `primary` (#FF5352) to `primary-container` (#FF5352) at a 45-degree angle. This provides a "glowing" energy that flat colors lack.

---

## 3. Typography: Editorial Authority

We pair the technical precision of **Inter** with the high-end editorial feel of **Public Sans**.

- **Display & Headlines (Public Sans):** Used for titles and high-level safety stats. The wider apertures of Public Sans convey a sense of modern transparency.
- _Headline-LG:_ 2rem. Use this for location names to command attention.
- **Body & Labels (Inter):** Used for all data points, descriptions, and ratings. Inter’s tall x-height ensures legibility against complex map backgrounds.
- _Body-MD:_ 0.875rem. The workhorse for community reports and descriptions.
- **Typography Hierarchy:** High contrast is key. Pair a `display-sm` headline with a `label-sm` in `on-surface-variant` to create a clear informational scent without needing icons for everything.

---

## 4. Elevation & Depth: Tonal Layering

We do not use shadows to simulate height; we use light.

- **The Layering Principle:** Place a `surface-container-lowest` (#0E0E0E) element inside a `surface-container-high` (#2A2A2A) parent to create a "recessed" input field look.
- **Ambient Shadows:** If a floating element requires a shadow (e.g., a critical alert pop-up), use a massive blur (32px) at 8% opacity using the `surface-tint` color. This creates a "glow" rather than a "drop shadow."
- **The "Ghost Border" Fallback:** If accessibility requires a stroke, use `outline-variant` (#5B403E) at 15% opacity. Never use 100% opaque lines.
- **Luminous Points:** Bus stops and safety hubs should use a radial gradient: `tertiary` (#4AE183) at the center, fading to 0% opacity at the edge of the radius, creating a "pulsing" safety beacon effect on the map.

---

## 5. Components: Precision Instruments

### Cards & Lists

- **Rule:** Forbid divider lines. Use `spacing-6` (1.3rem) of vertical white space or a shift to `surface-container-low` to separate items.
- **Safety Cards:** Use a `xl` (0.75rem) corner radius. Ratings should be represented by "Glow Stars" using the `secondary` (#FFCB8D) token with a subtle outer glow.

### Interactive Map Polygons

- **Danger Zones:** Use `error_container` (#93000A) with 40% opacity.
- **Safe Zones:** Use `tertiary_container` (#00A657) with 30% opacity.
- **Interaction:** On hover, increase opacity by 20% and add a `surface-bright` "Ghost Border."

### Buttons & Inputs

- **Primary Button:** Gradient fill (`primary` to `primary-container`), `full` (9999px) roundedness, and `label-md` uppercase text for a "tactical" feel.
- **Search Input:** Use `surface-container-highest` (#353534) with a `sm` (0.125rem) radius to feel like a precision tool.

### Community Specific Components

- **Risk Level Heat-Bar:** A segmented progress bar using `tertiary`, `secondary_container`, and `primary_container` to show a neighborhood's safety trend.
- **Glow-Point Radii:** For bus stops, use a `tertiary_fixed_dim` dot with a 2.25rem (`spacing-10`) soft radial glow to indicate the "safe walking zone."

---

## 6. Do’s and Don’ts

### Do

- **Do** use `surface-container-highest` for "active" states in lists rather than a border.
- **Do** lean into `surface-variant` for secondary text to maintain a low-strain reading experience.
- **Do** use the `2.5` (0.5rem) spacing unit as your "atomic" padding for internal card elements.

### Don't

- **Don't** use pure white (#FFFFFF) for text; always use `on-surface` (#E5E2E1) to reduce glare on dark backgrounds.
- **Don't** use standard "drop shadows" (0, 4, 4, black); they feel "cheap" in this editorial context.
- **Don't** use more than two font weights in a single component. Let the size and color (e.g., `on-surface` vs `on-surface-variant`) do the heavy lifting.
