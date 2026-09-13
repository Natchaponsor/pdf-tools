---
version: 1
slug: "src-views-home-tsx"
primary_target: "src/views/Home.tsx"
related_targets: ["src/App.tsx","src/views/CompressPdf.tsx","src/index.css"]
---

## Scope

Visitor mode: **Operate**. Surfaces: the app shell (`src/App.tsx`), the home
screen (`src/views/Home.tsx`), and Compress PDF (`src/views/CompressPdf.tsx`)
as the reference implementation the other 16 tool views inherit from.

Audience, job and constraints are unchanged from the product record: one
document, one problem, half the time on a phone in daylight, often something
private. No network request may carry user data, so any typeface ships
self-hosted and same-origin.

This is direction 2 of 3 built for comparison. It is the direction I ranked
first and the roll did not assign, kept as a full build so the choice between
worlds is made on screen rather than on description.

## Direction contract

THESIS: The logo is not a badge in the corner — it is the product's manner.
PaperPal is a helpful thing made of paper that reacts to what you hand it, and
the whole surface is built from the mark's own geometry: uniform stroke, round
joins, generous radii, two tones of blue and nothing else. It refuses the
arrangement the category ships by refusing its neutrality — every other tool in
this space is a faceless white grid, and this one has a face.

OWN-WORLD: White ground (#FFFFFF) with a pale blue recess (#F5F8FF) marking
every working area. Ink #0F1420, secondary #5B6576. One saturated blue
(#2563EB) for actions and the mark; the fold blue (#B9D1FF) fills illustration
and chips; nothing else is coloured. Every container is a rounded rectangle
from the mark's own family — 20px for working surfaces, 14px for controls,
full pills for buttons. Icons are redrawn at the logo's stroke weight and
joins so the tool set and the mascot are visibly the same hand. Display type is
Nunito, self-hosted: a rounded geometric with the same soft terminals as the
wordmark, chosen because the wordmark is a pinned brand commitment and the
headings should look like it rather than merely near it.

STORY: The visitor sees a character holding the thing they are about to do,
understands in one line that the work happens on their device, hands over a
file, and is walked to the right tool by something that behaves like it is
paying attention.

FIRST VIEWPORT: A white rail — mark and wordmark left, Tools and Settings
right, no rule beneath. Then the hero: a headline at 44–56px set tight, the
mascot at hero scale (120px+) to its right, sitting on the pale blue recess.
Directly beneath, a wide rounded drop card (radius 20, 2px dashed #C9D6EE) with
the pal inside it and a blue pill action. The privacy line sits under the
card as plain text. Below that, the tool set as a grid of white cards with
hairline borders and a pale blue rounded-square icon chip — the mark's
silhouette, repeated.

FORM: The Pal — the mascot's own world, extended from the supplied logo.
Candidate 1 of 7 on the grounded list, ordered by resonance; not the assigned
direction (the roll assigned 7). Presented to the user as IMPECCABLE'S PICK
with its familiarity named as the honest risk, and built here because the user
asked for each direction on its own branch. Seed key 5bd115e9, mode operate.

Signature interaction — **the pal reacts**: the mascot is a single component
with a small set of states (resting, alert when a file is dragged over,
working, done, stuck) and it is the same character on the home screen, inside
every drop zone, in every empty state and on every result. Nothing else in the
app animates a face, and it never animates for decoration — each state maps to
a real application state. Motion grammar: soft spring-ish ease on scale and
translate only, 200–320ms, reduced-motion renders each state statically.

HONEST RISK: this is what the logo already predicts and what most friendly-tool
redesigns ship. It will be immediately likeable and it may be forgettable; the
mascot has to carry real state information or it becomes a sticker.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

The mark is redrawn from a PNG; the original vector may replace it.
