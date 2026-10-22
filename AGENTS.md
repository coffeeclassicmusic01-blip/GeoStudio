<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the quote workspace on the index route and share browser-safe quote types, demo data, and filtering in a dedicated feature module so all views use the same records.
- This is a frontend mockup: keep edits in React session state and clearly treat contacts and quote records as demonstration data; do not introduce backend persistence without a separate request.

- Keep invoice workflow and Georevest validation in `src/features/invoices`; the index owns shared request, option, client and quote session state so navigation never discards submitted requests.
- Autofill invoice items only from explicitly stored quote items, never legacy generated item fallbacks; this preserves source values without inventing line items or units.
- Invoice attachments retain bytes in session state and print/export is browser-only; production storage, notifications, identity and permissions require a separate implementation request.
- Keep the company proposal template (letterhead, contacts, default texts, sample items) in `src/features/quotes/georevest.ts`; the builder and list PDF read from it so company data changes in one place.
- The quote builder exports what it renders: pages split at page-break blocks and are captured with html-to-image into jsPDF; list/detail exports use the jsPDF layout in `pdf.ts`, which mirrors the same template.
- App brand identity (logo pointer, name, aspect ratio, PDF logo preload) lives in `src/features/brand.ts`; UI and browser-generated documents read it so the mark is swapped in one place and never distorted.
