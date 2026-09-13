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

This is **v4**, assembled from the user's own review of v1, v2 and v3 rather
than from a fresh direction round. It takes v2's world and grafts v3's hero
structure onto it. Everything here is a stated preference, not a judgement
call:

1. v2's verb-grouped card layout (liked: "organized")
2. v2's light blue ground inside the upload box
3. v2's typeface (Nunito)
4. v3's horizontal hero: title and subtitle level with the upload box
5. v3's grey band separating the hero from the tool set
6. "Beta" rather than "Rough" on the experimental tools
7. No em dashes anywhere in rendered copy

## Direction contract

THESIS: The logo is not a badge in the corner — it is the product's manner.
PaperPal is a helpful thing made of paper that reacts to what you hand it, and
the whole surface is built from the mark's own geometry: uniform stroke, round
joins, generous radii, two tones of blue and nothing else. It refuses the
arrangement the category ships by refusing its neutrality — every other tool in
this space is a faceless white grid, and this one has a face.

OWN-WORLD: White ground (#FFFFFF) with two distinct secondary grounds doing
two distinct jobs: a pale blue recess (#E9F1FF) that means "hand a file over
here", and a neutral grey band (#F4F5F7) that means "this is the tool
catalogue". The grey is deliberately not a blue tint: two tinted grounds on
one page read as a gradient rather than as two kinds of place. Ink #0F1420, secondary #5B6576. One saturated blue
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

FIRST VIEWPORT: A white rail with a hairline beneath: mark and wordmark left,
Tools and Settings right. Then a two-column hero on white, vertically centred
so the headline and the drop box share a baseline: left, a headline at 38 to
48px set tight with a three-line supporting paragraph; right, the drop box,
its interior filled pale blue (#E9F1FF) with a dashed border, the pal inside,
and a blue pill action. The privacy line sits under the box. Below that, a
neutral grey band (#F4F5F7) carrying the whole tool set, so the page reads as
two distinct kinds of place: hand a file over up here, browse tools down
there. The tool set is verb-grouped, each tool a horizontal white card with a
pale blue rounded-square icon chip, the mark's silhouette repeated seventeen
times. The footer returns to white so the band delimits the tool area and
nothing else.

FORM: The Pal's world (grounded candidate 1 of 7, seed key 5bd115e9, mode
operate), restructured by user selection after seeing all three builds. The
direction round is not re-run: the user has now seen the alternatives rendered
and chosen between them, which is stronger evidence than another roll.

Signature interaction — **the pal reacts**: the mascot is a single component
with a small set of states (resting, alert when a file is dragged over,
working, done, stuck) and it is the same character on the home screen, inside
every drop zone, in every empty state and on every result. Nothing else in the
app animates a face, and it never animates for decoration — each state maps to
a real application state. Motion grammar: soft spring-ish ease on scale and
translate only, 200–320ms, reduced-motion renders each state statically.

HONEST RISK: assembling from liked parts tends toward the safe middle, and
this is now closer to the category standard than v2 was. What still separates
it from v3 is the character carrying real state and the verb grouping; if
either is weakened, this becomes v3 with a mascot. The mascot must keep
carrying state information or it becomes a sticker. Also: the hero's left
column is shorter than the drop box, so the two columns are balanced by
centring rather than by content, which will need re-checking if the headline
copy ever changes length.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

The mark is redrawn from a PNG; the original vector may replace it.
