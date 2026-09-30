# ocr-service — external OCR / extraction service for Workstream 1

This Node.js service is the reference implementation of the OCR contract used by the
Salesforce package in `../force-app` (`VisitingCardHttpOcrProvider`). It also runs as a
standalone phone-browser demo of the same Scan Visiting Card → Lead flow against an
in-memory mock org, which is useful when no Salesforce org is available.

## Contract used by the Salesforce adapter

```
POST /api/extract
Content-Type: application/json
x-api-key: <OCR_SERVICE_API_KEY>              (only when the variable is set)

{ "imageBase64": "...", "contentType": "image/jpeg", "fileName": "card.jpg" }

200 → { "contact": { firstName, lastName, jobTitle, company, mobile, phone, email, website,
                     address, city, state, country },
        "rawText": "...", "ocrConfidence": 92,
        "qr": { raw, format, contact } | undefined,
        "pipeline": { ocrProvider, parser, qrDetected, durationMs }, "warnings": [] }
```

The same endpoint accepts `multipart/form-data` with an `image` file (used by the built-in UI).
Set the Named Credential **Visiting Card OCR** URL to this service and its password to
`OCR_SERVICE_API_KEY`, then switch `Visiting_Card_Setting.Default` to `Http`.

---

A mobile-first, Salesforce-style experience for trade shows:

```
SCAN VISITING CARD → OCR / AI EXTRACTION → REVIEW INFORMATION → DUPLICATE CHECK
                                                                   ├─ NO MATCH   → CREATE LEAD
                                                                   └─ MATCH FOUND → OPEN / UPDATE EXISTING RECORD
```

The sample card (`public/demo/ameen-azeez-card.png` — Ameen Azeez, Chief Revenue
Officer, Fingertip) is a real image that goes through OCR and QR decoding like any
photo taken on a phone. Nothing about it is hard-coded in the UI.

## Run the demo

```bash
npm install
npm run dev          # http://localhost:3000
```

Open the page on a phone (or use the browser's device toolbar), tap **Take Photo**
or **Upload Image**, or use **Use the sample card**. No external services are
required: OCR runs locally with tesseract.js and Salesforce is an in-memory mock.

Use the ⚙ **Demo settings** menu in the header to toggle **Simulate existing
customer** — it seeds a "Fingertip" Account and "Ameen Azeez" Contact so the
"Potential Existing Customer Found" branch can be shown, and **Reset mock org**
clears any Leads you created.

Other commands:

```bash
npm test             # unit tests (parser, QR payloads, merge, duplicate check, and the LWC visitingCardParser module)
npm run typecheck
npm run lint
npm run build && npm start
npm run demo:extract           # run the extraction pipeline on the sample card from the CLI
npm run demo:extract -- my.jpg # ... or on any card image
npm run demo:card              # regenerate the sample card PNG
```

## Configuration (`.env.local`, all optional)

| Variable | Default | Purpose |
|---|---|---|
| `OCR_PROVIDER` | `tesseract` | OCR engine (`tesseract` or `none`). Add a cloud provider in `src/lib/ocr/index.ts`. |
| `OCR_SERVICE_API_KEY` | – | When set, `/api/extract` requires the value in the `x-api-key` header (the Salesforce Named Credential password). |
| `ANTHROPIC_API_KEY` | – | When set, Claude reads the card image + OCR text and returns structured fields (falls back to the heuristic parser on any failure). |
| `EXTRACTION_MODEL` | `claude-opus-5-5` | Model used for AI extraction. |
| `SALESFORCE_PROVIDER` | `mock` | `mock` (in-memory) or `jsforce` (real org). |
| `SALESFORCE_MOCK_SEED_EXISTING` | `false` | Start the mock org with the existing "Fingertip" customer seeded. |
| `SALESFORCE_LOGIN_URL`, `SALESFORCE_USERNAME`, `SALESFORCE_PASSWORD`, `SALESFORCE_SECURITY_TOKEN`, `SALESFORCE_INSTANCE_URL` | – | Credentials for the `jsforce` provider. |

## Architecture

```
src/
  app/
    page.tsx                                  Scan Visiting Card wizard
    records/[type]/[id]/page.tsx              Lightning-style record page (mock org)
    api/extract                               POST image → OCR + QR + parsing → structured data
    api/salesforce/duplicate-check            POST contact [+ object] → matches with confidence
    api/salesforce/leads                      POST contact → create Lead
    api/salesforce/records/[type]/[id]        GET record / PATCH update from card data
    api/demo/settings                         demo toggles (mock org only)
  lib/
    crm/types.ts                              CardContact + ExtractionResult contracts
    ocr/                                      OcrProvider interface, tesseract.js provider, image preprocessing
    qr/                                       jsQR decoder + vCard / MeCard payload parsing
    extraction/                               heuristic parser, optional AI parser, layer merge, pipeline
    salesforce/                               record types, mock + jsforce clients, duplicate-check service
  components/
    scan/                                     wizard steps (capture, extracting, review, check, result, complete)
    ui/                                       Salesforce-style primitives (Card, Button, Field, Badge, Alert, Stepper…)
```

### Extraction pipeline

1. **QR detection** (`jsqr`): the image is decoded at several scales; a vCard /
   MeCard / URL payload is parsed into contact fields, and the QR's bounding box is
   masked out before OCR.
2. **OCR** (`tesseract.js`, English data bundled from npm so it works offline):
   image is orientation-corrected, upscaled, greyscaled and contrast-normalised;
   words below 40% confidence are dropped.
3. **Parsing**: the deterministic heuristic parser classifies lines (email, URL,
   phone with mobile/landline detection, job-title and company vocabulary,
   address / city / state / country, name). With `ANTHROPIC_API_KEY` set, Claude
   sees the image + OCR text and returns the same structure via structured output.
4. **Merge**: QR fields win, then AI, then OCR; the review screen shows the source
   of every value as a badge. Nothing is written to Salesforce at this point.

### Duplicate check

`src/lib/salesforce/duplicate-check.ts` searches Leads, Contacts and Accounts on
email, normalised phone (last 10 digits), first + last name, normalised company
name and web domain (webmail domains ignored). Each candidate lists its matched
fields and a confidence score; the UI checks the three objects one after another
so the presenter sees "Checking Leads… Contacts… Accounts…".

### Swapping in production services

* **OCR**: implement `OcrProvider` (`src/lib/ocr/types.ts`) and register it in
  `getOcrProvider()`.
* **Salesforce**: `JsforceSalesforceClient` already implements the
  `SalesforceClient` interface with SOQL; set `SALESFORCE_PROVIDER=jsforce`.
  Record links then open in Lightning Experience.

## Out of scope for this stage

Lead qualification, Opportunities, samples, quotations, pricing, SAP, forecasting,
customer service, repeat business and order management are intentionally not built.
