# SPM Automation

SPM Automation is an internal sales memo generator for capital markets and deal teams. It turns large offering documents into standardized sales memos in about 5 minutes instead of the roughly 1-hour manual workflow it replaces.

Live app: [salesmemo.vercel.app](https://salesmemo.vercel.app)

## What It Does

- Uploads word-searchable offering documents such as official statements, offering memoranda, circulars, and related deal materials
- Extracts key deal details and optional sections from the source PDF
- Generates a client-formatted sales memo in a standardized structure
- Supports DOCX export and copy workflows for downstream use

## Why It Exists

- Manual transcription slowed turnaround and introduced avoidable human error
- Creating memos required repetitive formatting and operational handoffs
- Teams needed a faster way to produce standardized outputs without rebuilding the format each time

## How It Works

1. Upload a PDF
2. Select optional memo sections and enter any required dates
3. Generate the memo
4. Review the output and export or copy it for distribution

## Usage Notes

- Best results come from clean, word-searchable PDFs
- Generated outputs should still be reviewed before client use
- If key fields are missing or uncertain, the output may include `XXXXX` placeholders
- Large PDFs may fail direct upload; trimming appendices, embedded prior documents, or image-heavy pages often helps

## Stack

- React + Vite frontend
- Tailwind + shadcn/ui component layer
- Supabase Edge Functions backend
- Gemini or other APIs for document ingestion and extraction

## Local Development

If you want to run the app locally:

```sh
npm install
npm run dev
```

Frontend environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Supabase function environment variables:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `GEMINI_API_VERSION`

Optional PDF normalization secret:

- `PDF_NORMALIZER_API_KEY`

## Key Files

- `src/pages/Index.tsx`: main upload and generation flow
- `src/components/ResultsPanel.tsx`: memo rendering, copy, and export behaviors
- `src/lib/export/`: DOCX export formatting and document-building logic
- `supabase/functions/generate-memo/`: prompt construction, PDF handling, extraction, and post-processing

## Disclaimer

This tool is designed to accelerate memo preparation, not replace human review. Outputs should be verified before external distribution.
