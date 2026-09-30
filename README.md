# Apex Coco & Solar Energy — Salesforce Sales Cloud Demo Build

## Workstream 1 — Visiting Card → Lead

This repository contains the complete **Lead Capture & Qualification** workstream:
a salesperson scans a visiting card on Salesforce mobile, the card information is
extracted, reviewed and corrected, checked against existing records, and a Lead is
created, enriched and qualified until it is ready for a Sample Request (handoff to
Workstream 2).

```
SALESFORCE MOBILE → Scan Visiting Card → OCR / Card Extraction → Review & Correct
→ Duplicate Check → Create Lead → Enrich Lead → Qualify Lead → Sample Request Ready
→ HANDOFF TO WORKSTREAM 2
```

The repository has two parts:

| Folder | What it is |
|---|---|
| `force-app/` | Salesforce DX source: Lead fields, Lightning web components, Apex OCR adapter, duplicate check, qualification automation, permission set, app, tab, quick action. **This is the Workstream 1 deliverable.** |
| `ocr-service/` | Optional external OCR / extraction service (Node.js, tesseract.js + jsQR). The Apex `Http` provider calls it through a Named Credential. It also runs as a standalone phone-browser demo of the same flow with a mock org. See `ocr-service/README.md`. |
| `manifest/package.xml` | Deployment manifest containing only Workstream 1 metadata. |
| `data/`, `scripts/apex/` | Demo data: the shared **ABC Foods International** Lead and an optional existing customer for the duplicate-check demo. |

---

## 1. Setup

### Prerequisites

- Salesforce CLI (`sf`) ≥ 2.x and a Developer Edition, sandbox or scratch org.
  Lightning Experience and the Salesforce mobile app must be enabled (standard in all editions).
- Node.js ≥ 20 only if you run the optional OCR service or the unit tests.

### Deploy Workstream 1

```bash
git clone <repo> && cd ApexCoco
sf org login web --alias apexdemo                      # or: sf org create scratch -f config/project-scratch-def.json -a apexdemo
sf project deploy start --manifest manifest/package.xml --target-org apexdemo
sf org assign permset --name Visiting_Card_Lead_Capture --target-org apexdemo
sf apex run --file scripts/apex/seed-demo-data.apex --target-org apexdemo   # demo data (optional)
sf apex run test --test-level RunLocalTests --wait 10 --target-org apexdemo # Apex tests
```

Alternative for the demo data (sObject tree):

```bash
sf data import tree --files data/Lead-ABC-Foods-International.json --target-org apexdemo
sf data import tree --files data/Existing-Customer-Fingertip.json --target-org apexdemo   # only for the "existing customer" path
```

### Manual steps after deployment

1. **Lead record page** — Setup → Object Manager → Lead → Lightning Record Pages → edit the
   page used on mobile and desktop, drag **Lead Enrichment & Qualification** (`leadQualification`)
   onto the page, save and activate. (Not shipped as a FlexiPage so the org's existing Lead page is not overwritten.)
2. **Mobile navigation** — Setup → Salesforce Navigation, add **Scan Visiting Card** (or use the
   **Apex Sales** app, which already contains the tab and has the Small form factor enabled).
3. **Lead page layout (optional)** — add the new fields (Event Name, Customer Type, Interested Product,
   Expected Annual Volume, Volume Unit, Purchase Timeline, Current Supplier, Competitor, Potential Rating,
   Lead Score, Sample Requested, Sample Request Date, Qualification Notes, Next Action, Next Follow-up Date,
   Scan Source / Time / Status / Provider) to the Lead page layout if you want them outside the component.
4. **Real OCR (optional)** — see section 4.

### Standard value sets — read before deploying to a shared org

`LeadStatus` and `LeadSource` are deployed as complete standard value sets so that
**Qualified / Ready for Sample** and **Trade Show / Exhibition** exist. The files contain the
Developer Edition defaults plus those two values. If your org already has customised Lead
Status or Lead Source values, remove the two `StandardValueSet` members from `manifest/package.xml`
and add the two values manually in Setup instead (deploying the files would replace the org's list).

---

## 2. Metadata (all Workstream 1, deterministic names)

| Type | Name | Purpose |
|---|---|---|
| Lead fields | `Event_Name__c`, `Customer_Type__c`, `Interested_Product__c`, `Expected_Annual_Volume__c`, `Volume_Unit__c`, `Purchase_Timeline__c`, `Current_Supplier__c`, `Competitor__c`, `Potential_Rating__c`, `Lead_Score__c`, `Sample_Requested__c`, `Sample_Request_Date__c`, `Qualification_Notes__c`, `Next_Action__c`, `Next_Follow_up_Date__c` | Lead Data Model from the spec (standard fields cover First/Last Name, Title, Company, Email, Phone, Mobile = `MobilePhone`, Website, Lead Source, Country) |
| Lead fields (audit) | `Scan_Source__c`, `Scan_Time__c`, `Scan_Status__c`, `Scan_Provider__c` | OCR contract: record scan source / time / status |
| LWC | `scanVisitingCard` | Mobile capture → extract → review → duplicate check → create Lead |
| LWC | `leadQualification` | Enrich Lead, Qualify Lead, Sample Request handoff checklist |
| LWC (service) | `visitingCardParser` | Rule-based text parser, vCard / MeCard QR parser, layer merge |
| Static resource | `jsQR` | QR decoding on the device (Apache-2.0) |
| Apex | `VisitingCardOcrProvider` (interface), `VisitingCardMockOcrProvider`, `VisitingCardHttpOcrProvider`, `VisitingCardOcrService` | Replaceable OCR adapter |
| Apex | `LeadDuplicateCheckService` | Email → phone → company duplicate detection on Leads, Contacts, Accounts |
| Apex | `LeadQualificationHandler` + `LeadTrigger` | Lead Score, Sample Request Date default, Status = Qualified / Ready for Sample |
| Apex | `VisitingCardController`, `VisitingCardData`, `VisitingCardOcrResult` | LWC controller and data contracts |
| Apex tests | `VisitingCardControllerTest`, `VisitingCardOcrServiceTest`, `VisitingCardDataTest`, `LeadDuplicateCheckServiceTest`, `LeadQualificationHandlerTest` | |
| Custom metadata | `Visiting_Card_Setting__mdt` + record `Default` | Selects the OCR provider (`Mock` / `Http`), Named Credential, path, timeout |
| Named credential | `Visiting_Card_OCR` | Endpoint + API key of the external OCR service |
| Permission set | `Visiting_Card_Lead_Capture` | App, tab, classes, Lead field access; Contact/Account read for the duplicate check |
| App / tab / action | `Apex_Sales_Mobile`, `Scan_Visiting_Card`, `Lead.Scan_Visiting_Card` | Entry points on mobile and on a Lead record |
| Standard value sets | `LeadStatus`, `LeadSource` | Adds *Qualified / Ready for Sample* and *Trade Show / Exhibition* |

Nothing in this package touches Sample Request, Opportunity, Quote or Order metadata
(Workstream 2). `LeadTrigger` is the single Lead trigger; Workstream 2 logic must be
coordinated before being added to it.

---

## 3. The user journey in the org

1. Open the **Salesforce mobile app** → **Apex Sales** app → **Scan Visiting Card**
   (also available as the *Scan Visiting Card* action on a Lead record).
2. **Take Photo** opens the rear camera; **Upload Image** picks a photo; **Enter details manually** skips extraction.
3. **Extracting Information** — the photo is downscaled on the device, the **QR code is decoded on the device**
   (vCard / MeCard / URL), then the image is sent to the configured OCR provider through Apex. Results are merged
   (QR > OCR service fields > rule-based parse of the OCR text) and each field shows where it came from.
4. **Review Extracted Information** — editable fields (First Name, Last Name, Title, Company, Email, Phone, Mobile,
   Website, Country, Event Name, Lead Source = *Trade Show / Exhibition* by default). **Edit Information** /
   **Confirm & Check Existing Records**. If extraction fails or returns nothing, the same form opens in manual-entry mode.
5. **Checking Existing Records** — Leads, Contacts and Accounts are checked (email first, then phone and company;
   name and web domain are supporting signals) and shown one after another.
6. **New Prospect** → **Create Lead**. **Potential Existing Customer Found** → **Open Existing Customer**,
   per-record **Open**, or **Create New Lead Anyway** behind an explicit duplicate warning. Nothing is merged or
   modified automatically.
7. **Lead Created** → **Open Lead & Qualify**. The Lead carries Lead Source, Scan Source / Time / Status / Provider.
8. **Enrich & Qualify Lead** (`leadQualification`, inline and on the Lead record page): enrichment fields, qualification
   fields, live **Lead Score**, and the Sample Request handoff checklist. **Mark Ready for Sample Request** sets
   *Sample Requested = Yes* and *Next Action = Create Sample Request*; the trigger sets
   *Status = Qualified / Ready for Sample* once the exit condition holds.

### Workstream 1 exit condition (enforced by `LeadQualificationHandler.isReadyForSample`)

Lead exists + contact details (email or phone) + Lead Source + Interested Product + Sample Requested = Yes
+ Next Action = Create Sample Request → Status = *Qualified / Ready for Sample*. Purchase Timeline / Expected
Annual Volume are captured where available and feed the Lead Score.

---

## 4. OCR / scanning implementation contract

The OCR engine sits behind `VisitingCardOcrProvider`:

```
Image (mobile camera / upload) ─► scanVisitingCard (LWC)
        │  QR decoded on device (jsQR static resource)
        ▼
VisitingCardController.extractCard ─► VisitingCardOcrService ─► provider from Visiting_Card_Setting__mdt
        │                                                   ├─ VisitingCardMockOcrProvider  (default: no OCR)
        │                                                   └─ VisitingCardHttpOcrProvider  (Named Credential → external service)
        ▼
VisitingCardOcrResult { rawText, fields, confidence, warnings } ─► visitingCardParser (LWC) ─► structured fields
```

| Provider | When to use | Dependency |
|---|---|---|
| `Mock` (default) | Org-only demo. Text is not read; the QR code on the card (decoded on the device) and manual entry supply the data. The sample card's QR carries a full vCard. | none |
| `Http` | Real OCR. Posts `{ imageBase64, contentType, fileName }` to `callout:<Named Credential><path>` with `x-api-key: {!$Credential.Password}` and reads `{ contact, rawText, ocrConfidence, pipeline, warnings }`. | Reference service in `ocr-service/` (or any service honouring the contract), a Named Credential, Remote Site not needed |

To enable real OCR: deploy `ocr-service/` somewhere reachable over HTTPS with `OCR_SERVICE_API_KEY` set, then in
Setup → Named Credentials → **Visiting Card OCR** set the URL and the password (= the API key), and change the
`Visiting_Card_Setting.Default` record's **OCR Provider** to `Http`. To add another vendor (e.g. Google Vision),
implement `VisitingCardOcrProvider` and register it in `VisitingCardOcrService.newProvider()`.

Why no in-org OCR: Lightning Web Security does not allow the Web Workers that browser OCR engines (tesseract.js)
need, so text recognition must run outside the component. QR decoding (pure JS + canvas) runs fine on the device.

---

## 5. Duplicate handling

`LeadDuplicateCheckService.check` — email first (exact, Leads + Contacts), then phone / mobile (trailing 10 digits,
Leads + Contacts + Accounts) and company (normalised, Leads + Accounts); name and web domain add confidence.
Every match lists its matched fields and a confidence score (email 55, phone 35, name 25, company 20, domain 20,
soft-capped at 99). The salesperson can open any existing record or choose *Create New Lead Anyway*. No merge or
update logic is built.

---

## 6. Dependencies, editions and assumptions (documented, not assumed)

- **Edition**: Developer / Enterprise / Unlimited (custom metadata types, Named Credentials, LWC quick actions).
  Professional Edition would need the Apex/API add-on.
- **Mobile**: Salesforce mobile app with Lightning Experience; the `scanVisitingCard` LWC is exposed as a tab
  (mobile navigation), app page and Lead record action. Camera access uses the standard file input with
  `capture="environment"`; on some Android builds this opens the gallery/camera chooser instead of the camera directly.
- **Permissions**: users need the `Visiting_Card_Lead_Capture` permission set (Lead create/edit, Contact/Account read
  for the duplicate check, the Apex classes, the app and tab).
- **External service**: only for the `Http` provider (Named Credential `Visiting_Card_OCR`, outbound HTTPS).
- **Picklist values** for Customer Type, Interested Product, Volume Unit, Purchase Timeline, Next Action, Potential
  Rating are placeholders derived from the spec examples (e.g. *B2B / Importer*, *Coconut Milk Powder*, *MT*, *3–6 Months*);
  adjust them in the field metadata before go-live.
- **Sample Requested** is a checkbox (Yes = checked) so that Workstream 2 can filter on it directly.
- **Standard value sets** replace the org's Lead Status / Lead Source lists (see section 1).
- **Testing**: Apex tests and LWC bundles were syntax/compile-checked offline (apex-parser, `@lwc/compiler`) and the
  metadata was converted with `sf project convert source`; they have not yet been executed in an org from this
  environment. Run `sf apex run test` after deployment.

---

## 7. Integration contract with Workstream 2

| Shared item | Workstream 1 provides |
|---|---|
| Lead | Created, enriched and qualified; `Status = Qualified / Ready for Sample` when complete |
| Sample Requested | `Sample_Requested__c` (checkbox) + `Sample_Request_Date__c` (defaults to the day it was ticked) |
| Next Action | `Next_Action__c = Create Sample Request` |
| Account / Contact | Not converted by Workstream 1 |
| Demo data | ABC Foods International Lead (`data/Lead-ABC-Foods-International.json`, `scripts/apex/seed-demo-data.apex`) |

---

## 8. Development

```bash
# Salesforce
sf project deploy start --manifest manifest/package.xml --target-org apexdemo
sf apex run test --test-level RunLocalTests --target-org apexdemo

# Unit tests for the LWC parser module and the OCR service (Node)
cd ocr-service && npm install && npm test
```

Git: all Workstream 1 work is on the feature branch `viresh`. Do not rename shared objects/fields; do not add
Workstream 2 automation to `LeadTrigger` without coordination.
