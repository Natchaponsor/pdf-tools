# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is a person on a phone or laptop who has one PDF and one
problem with it right now — it is too big to email, it is in the wrong order,
it is a photographed stack of pages, it needs a password removed. They are not
a document professional and they are not in a workflow; they arrive, do one
job, and leave.

The situation that shapes everything: the document is often something they
would not hand to a stranger — a contract, a payslip, an ID scan, a bank
statement. That is why they are looking for an alternative to the usual
upload-it-to-a-server converter sites.

Audience reach (confirmed): a **small public tool, open to anyone, but not
marketed**. Strangers may land on it, so it must establish trust honestly and
immediately; it must not carry sales furniture, testimonials, stat counters, or
pricing, because there is nothing to sell and no real social proof to cite.

## Product Purpose

PaperPal does ordinary PDF chores — compress, merge, split, organize, rotate,
convert, protect, scan, OCR — **entirely inside the browser**, with no backend,
no account, and no request that carries a user's file anywhere.

Success is a user completing their one job in under a minute and understanding,
without having to take anyone's word for it, that the file never left their
device.

## Positioning

Every mainstream competitor in this category ("compress a PDF online") uploads
the document to a server the user does not control. PaperPal runs mature PDF
engines — MuPDF, Ghostscript, Tesseract, OpenCV — as WebAssembly in the page
itself.

The claim a neighboring product cannot truthfully copy: **open the network tab
and check.** The privacy is verifiable rather than promised, because there is
no backend to trust. This is the product, not a feature of it.

## Operating Context

- Roughly half of real use is on a phone, often one-handed, often to prepare a
  file for an email or an upload form that just rejected it for being too big.
- The app is an installable PWA and works fully offline after first load —
  including the WASM engines, the OCR models, and every code-split tool view.
- Hosted on GitHub Pages, which cannot set response headers. Confirmed working
  consequence: no COOP/COEP, no cross-origin isolation, no SharedArrayBuffer.
- Files are user-supplied and can be large; the compressor enforces a 50 MB
  budget with a friendly over-limit message rather than failing silently.
- Work is genuinely slow sometimes (Ghostscript on a 45 MB scan takes ~16s).
  Waiting is a real, designed-for state, not an edge case.

## Capabilities and Constraints

**17 tools**, grouped as a main set plus a "Sandbox" section for the newer,
experimental ones (Scan documents, Translate, Read aloud). Headline tool is
Compress PDF. Full inventory and per-tool behavior: README.md.

Durable technical constraints:

- **No network request may ever carry user data.** No analytics, no CDN, no
  webfont fetched from a third party, no telemetry. Everything is self-hosted
  and same-origin. This is absolute and outranks any design preference.
- React 19 + Vite + Tailwind CSS v4 + TypeScript. Hash routing (`#/compress`),
  no history API, so refreshes and deep links work on static hosting.
- Every tool view is code-split and lazily loaded; the home screen must stay
  light.
- Licensed **AGPL-3.0-or-later**, forced by MuPDF and Ghostscript.
- Deployed at `https://natchaponsor.github.io/pdf-tools/` with Vite
  `base: '/pdf-tools/'`, matched by the PWA manifest `id`/`scope`/`start_url`
  and the service worker's navigate fallback.

**Confirmed product decisions for the current rename:**

- The product is being renamed **Paperplane → PaperPal**, with a new two-tone
  blue mascot logo (a rounded-square document with a face).
- The live URL **stays `/pdf-tools/` for now**. The rename changes only what
  users see. A **custom domain is planned eventually**, so path and base-URL
  configuration should be structured so a real domain can be dropped in without
  a second migration — and no new hardcoded absolute paths may be introduced.

**Explicitly undecided:** the custom domain name and its date.

## Brand Commitments

- **Name: PaperPal.** Binding.
- **Logo: the supplied two-tone blue mascot** — a rounded-square document with
  a folded corner and a face (two eyebrows, two eyes, a smile), drawn in a
  uniform stroke with round joins. Version chosen: **v2**, the variant whose
  folded corner is filled pale blue rather than grey. Binding.
- **Voice: plain, honest, unexcited.** The existing copy tells users when a
  file will not shrink instead of pretending otherwise ("Text-born PDFs that
  are already efficient won't shrink much at any level — that's expected, and
  the app tells you so"). That candor is a brand commitment, not a copy style.
- Author credit and AGPL-3.0 notice appear in the footer.
- Seasonal themes (spring / summer / fall / winter) alongside light and dark
  are an existing shipped personality feature.

## Evidence on Hand

- Real, measured compression benchmarks on a 44.9 MB / 24-page scanned PDF
  (README.md): Light 0%, Balanced 95%, Smallest 97%, with real timings. These
  numbers are true and may be cited.
- The verifiable-privacy demonstration (open devtools, see zero file-bearing
  requests) is real and has been confirmed headlessly.
- Logo source: supplied by the user as raster attachments. **An SVG does not
  yet exist** and must not be assumed.
- **There are no users to quote, no customer count, no press, no testimonials,
  and no revenue.** Future work must not fabricate any of these.

## Product Principles

1. **Verifiable beats promised.** The privacy claim is the product; anything
   that makes it checkable is worth space, and anything that merely asserts it
   loudly is not.
2. **One job, fast, then leave.** Nobody wants to spend time here. The measure
   of the interface is how quickly it becomes irrelevant.
3. **Say the true thing, including when it's disappointing.** Tell users a file
   won't shrink, that a tool is experimental, that a step takes 16 seconds.
4. **Phone-first, offline-real.** A tool that only works on a fast laptop with
   a connection has failed the actual usage scene.
5. **No selling.** No marketing furniture, no invented proof, no growth
   mechanics. The tool earns its own case.

## Accessibility & Inclusion

No formal standard has been established as a requirement. Product-specific
needs that are already real: the app is used one-handed on phones (touch
targets and reach matter), and the Read-aloud tool exists specifically to make
scanned documents accessible to someone who cannot comfortably read them.
