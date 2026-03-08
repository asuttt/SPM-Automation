# SPM Automation

Sales memo generator for turning large municipal finance offering documents into a standardized client memo format.

## Stack

- React + Vite frontend
- Supabase Edge Function backend
- Google Gemini PDF ingestion and extraction
- Tailwind + shadcn/ui components

## Current flow

1. Upload a PDF in the frontend.
2. Select optional memo sections and any manual schedule overrides.
3. Frontend sends the PDF and options to the `generate-memo` Supabase Edge Function.
4. The edge function builds the memo prompt, sends the PDF to Gemini, and returns HTML.
5. Frontend renders the memo and supports plain-text copy.

## Local development

```sh
npm install
npm run dev
```

## Environment

Frontend expects:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Supabase Edge Function expects:

- `GEMINI_API_KEY`

## Key files

- `src/pages/Index.tsx`: main upload and generation flow
- `src/components/FileUpload.tsx`: PDF upload UI
- `src/components/OptionalSectionsSelector.tsx`: optional memo sections picker
- `src/components/ResultsPanel.tsx`: memo rendering and copy flow
- `supabase/functions/generate-memo/index.ts`: prompt construction and Gemini call

## Notes

- Output is HTML and may contain `XXXXX` placeholders for missing or uncertain fields.
- Generated output should still be reviewed before client use.
