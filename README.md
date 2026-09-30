# Apex Coco & Solar Energy — Salesforce Demo: Person 2 (Sample → Opportunity → Pricing → Quote → Onboarding → Order → Repeat Business)

This repository contains the complete, deployable **Person 2 workstream** of the Apex Coco Salesforce demo, built as an SFDX
source project for a Developer Edition org (or sandbox). Person 1 (Visiting Card → Lead, OCR, card scanning, lead
qualification) is built separately; Person 2 starts from the qualified Lead that Person 1 hands over.

> **Demo story.** ABC Foods International (USA importer, Michael Anderson, 500 MT/yr Coconut Milk Powder, buying from
> Competitor A) asks for a sample. Sample #1 is rejected (texture / specification), the opportunity stays open, sample #2 is
> approved, the deal moves through technical evaluation, pricing, quote v1 ($3,400/MT) → v2 ($3,500/MT), discount approval,
> customer approval, onboarding, PO (100 MT), a simulated SAP handoff, and into the repeat-business engine.

## What is built

| Area | Metadata | Notes |
|---|---|---|
| Sample management (hero) | `Sample_Request__c` (32 fields), Path, 10 validation rules, 5 list views, 3 flows, "New Sample Iteration" action | Requested → Approval Pending → Prepared → Dispatched → Customer Testing → Feedback Received → Approved / Rejected / Closed. A rejected sample never closes the opportunity. |
| Opportunity lifecycle | 11 Apex stages (`OpportunityStage` value set), Path, 22 fields, 6 validation rules, 3 flows | Opportunity is created at **Sample Requested** when a sample is requested; never duplicated for the same account + product. |
| Lead hand-off | `Lead.Request_Sample` quick action → screen flow → Apex `LeadSampleConversionService` | Converts the qualified lead to Account + Contact (no standard opportunity), attaches to an existing customer by company name, creates the Apex opportunity and Sample Request #1. |
| Pricing & quotes | Quote/QuoteLineItem fields, versions (`Revise Quote` action), last-price-to-customer, margin roll-up, `Apex_Quote_Discount_Approval` (Sales Manager → Management), 4 flows | Discount threshold and approver chain are configurable DEMO values in `Apex_Demo_Setting__mdt`. |
| Competitor intelligence | `Competitor_Intel__c`, quick action from Opportunity, report | Kept on the account and opportunity, not only on a quote. |
| Customer onboarding | `Customer_Onboarding__c` (5 checklist areas with owner/status), 2 flows | Created automatically at Customer Approval. Checklist areas are DEMO placeholders. |
| PO → Order → SAP | Order fields, automatic Order + Order Product at PO Received, `Send to SAP (Simulated)` action, `Integration_Log__c` | **No live SAP.** The handoff is a labelled mock with outbound/inbound logs. |
| Repeat business | Account roll-ups (last purchase, interval, expected reorder, reorder status), daily scheduled flow | Creates one follow-up task and one pre-filled Repeat opportunity when a reorder is due. |
| Service linkage | Case fields (complaint type, product `Complaint_Product__c`, batch, order), Quality Team queue, routing flow | Email-to-Case routing address is a manual org step (see below). |
| UX | Apex Sales app, 5 Lightning record pages (Sample Request, Opportunity, Account 360, Quote, Order), 9 layouts, 8 compact layouts, 4 tabs | Critical fields above the fold; related lists for samples, quotes, competitors, onboarding, orders, cases, activities. |
| Analytics | 11 reports, 2 dashboards (Sales Management, Sample Management), 2 custom report types | Dynamic dashboards (logged-in user). |
| Access | 4 permission sets: Apex Sales Executive, Apex Sales Manager, Apex Sales Admin, Apex Management | Not overbuilt; each demo user sees the intended experience. |
| Demo data | `scripts/apex/loadDemoData_1_Master.apex, loadDemoData_2_Pipeline.apex, loadDemoData_3_Commercial.apex and loadDemoData_4_Context.apex (in that order)`, `loadGoldenLead.apex`, `resetDemoData.apex` | 10 accounts, 13 contacts, 9 products with price book, 9 opportunities across all stages, 10 samples (incl. rejected → approved iteration), 7 quotes (incl. revision), 8 orders with 90-day and 30-day cadences, competitor intel, onboarding, cases, activities. |

Detailed documentation:

* [docs/01-data-model.md](docs/01-data-model.md) — every object, field, API name, picklist, validation rule and stage (generated from metadata)
* [docs/02-automation.md](docs/02-automation.md) — every flow, approval process, quick action and its fault handling
* [docs/03-demo-script.md](docs/03-demo-script.md) — the click-by-click golden demo and the negative scenarios
* [docs/04-test-checklist.md](docs/04-test-checklist.md) — T01–T20 configuration tests
* [docs/05-open-validate-phase2.md](docs/05-open-validate-phase2.md) — DEMO / OPEN / VALIDATE items and Phase 2 candidates

## Repository layout

```
sfdx-project.json                 two package directories (see below)
manifest/package.xml              Person 2 metadata manifest (generated from the tree)
manifest/package-shared-lead-contract.xml
force-app/main/default/           Person 2 metadata (objects, flows, layouts, pages, reports, permission sets, Apex, ...)
shared-lead-contract/main/default/objects/Lead/fields   the 15 frozen Lead fields Person 2 consumes (Person 1 owns them)
scripts/deploy.sh                 one-command deploy (+ optional data)
scripts/apex/loadDemoData_1..4_*.apex  demo data in four parts, run in order (labelled APEX DEMO DATA)
scripts/apex/loadGoldenLead.apex  the qualified ABC Foods lead for the merged Person 1 + Person 2 run
scripts/apex/resetDemoData.apex   removes the demo data so the org can be reset before each run
docs/                             documentation
```

### The shared Lead contract

Person 2 never renames or redefines Person 1's Lead fields. The API names Person 2 consumes are:

`Lead.Customer_Type__c`, `Business_Type__c`, `Interested_Product__c` (lookup Product2), `Expected_Annual_Volume__c`,
`Volume_Unit__c`, `Purchase_Timeline__c`, `Current_Supplier__c`, `Competitor__c`, `Potential_Rating__c`, `Lead_Score__c`,
`Sample_Requested__c`, `Sample_Request_Date__c`, `Qualification_Notes__c`, `Next_Action__c`, `Next_Follow_up_Date__c`.

They live in `shared-lead-contract/` so Person 2 can be deployed and tested stand-alone. When merging with Person 1:
if Person 1 already created these fields with the same API names, drop `shared-lead-contract/` (or keep one copy); if Person 1
used different API names, freeze the names together and update only the two places that read them —
`flows/Apex_Lead_Request_Sample.flow-meta.xml` and `flows/Apex_Sample_Request_After_Create.flow-meta.xml` (the `$Record.Lead__r.*` references).

## Prerequisites

* Salesforce Developer Edition org (or sandbox) with **Lightning Experience**. Quotes, Orders and Path are enabled by the
  deployed settings metadata (`settings/Quote`, `settings/Order`, `settings/PathAssistant`).
* Salesforce CLI (`sf`) v2, authenticated: `sf org login web --alias apexdemo`.
* Multi-currency off (demo prices are USD in the org's single currency).

## Deploy

```bash
# 1. settings, 2. Lead contract (only if Person 1's fields are not in the org yet), 3. Person 2 metadata, 4. permission sets, 5. data
./scripts/deploy.sh apexdemo --with-lead-contract --data
# merged demo start (qualified lead instead of the pre-loaded account):
sf apex run --target-org apexdemo --file scripts/apex/loadGoldenLead.apex
```

Manual equivalents:

```bash
sf project deploy start --target-org apexdemo --source-dir force-app/main/default/settings --wait 20
sf project deploy start --target-org apexdemo --source-dir shared-lead-contract --wait 20        # optional, see above
sf project deploy start --target-org apexdemo --source-dir force-app --wait 60 --test-level RunSpecifiedTests --tests LeadSampleConversionServiceTest
for ps in Apex_Sales_Executive Apex_Sales_Manager Apex_Sales_Admin Apex_Management; do sf org assign permset --target-org apexdemo --name $ps; done
sf apex run --target-org apexdemo --file scripts/apex/loadDemoData_1_Master.apex
sf apex run --target-org apexdemo --file scripts/apex/loadDemoData_2_Pipeline.apex
sf apex run --target-org apexdemo --file scripts/apex/loadDemoData_3_Commercial.apex
sf apex run --target-org apexdemo --file scripts/apex/loadDemoData_4_Context.apex
sf org open --target-org apexdemo --path /lightning/app/c__Apex_Sales
```

### Post-deploy manual steps (cannot be deployed as metadata)

1. **Approvers.** The DEMO approval chain resolves the Sales Manager approver as the quote owner's *Manager* (User field) and
   the Management approver from `Apex_Demo_Setting__mdt.Default.Management_Approver_Username__c` (else the manager's manager,
   else the sales manager approver). In a single-user dev org both resolve to you, so approvals still work. For the real demo,
   set the Manager field on the Sales Executive user and put the Management user's username in the custom metadata record.
2. **Email-to-Case (optional).** Setup → Email-to-Case → add a routing address for the complaints mailbox. The routing flow
   assigns complaint cases to the *Quality Team* queue regardless of how the case is created.
3. **Home page / mobile.** Add the Apex Sales app to the mobile navigation if you demo on a phone.
4. **Scheduled flows** (`Apex Opportunity - Stale Check`, `Apex Account - Reorder Follow-up`) run daily at 02:00 / 03:00 UTC.
   To demo them immediately, open the flow in Flow Builder and use *Run* / *Debug* with a record, or temporarily lower
   `Stale_Opportunity_Days__c` / raise `Reorder_Lead_Days__c` in the custom metadata record.

### Reset between demo runs

```bash
sf apex run --target-org apexdemo --file scripts/apex/resetDemoData.apex
sf apex run --target-org apexdemo --file scripts/apex/loadDemoData_1_Master.apex
sf apex run --target-org apexdemo --file scripts/apex/loadDemoData_2_Pipeline.apex
sf apex run --target-org apexdemo --file scripts/apex/loadDemoData_3_Commercial.apex
sf apex run --target-org apexdemo --file scripts/apex/loadDemoData_4_Context.apex
```

## Golden demo in one screen (details in docs/03-demo-script.md)

1. Apex Sales app → Accounts → **ABC Foods International**: Customer 360 (contacts, competitor intel on Competitor A at $3,400, no opportunity yet: a price enquiry is not an opportunity).
2. **New Sample Request** (Laura Chen, Coconut Milk Powder, 5 KG) → opportunity *ABC Foods International - Coconut Milk Powder* is created at **Sample Requested**; Sales Admin gets the preparation task.
3. Sales Admin list view *To Prepare / Dispatch* → Prepared (batch) → **Dispatched without tracking = blocked** → add DHL + tracking → opportunity moves to **Sample Testing** automatically.
4. Customer Testing → Feedback Received with feedback "texture / clumping", Result **Rejected** (reason + next action mandatory) → opportunity **stays open**, owner notified, task "Agree revised specification and send sample #2".
5. **New Sample Iteration** → SMPREQ-…2 (iteration 2, modified specification) → Approved → opportunity **Sample Approved**, Sample Approved Date set, technical-evaluation task.
6. Technical Evaluation (status Complete) → Pricing Discussion → **New Quote** v1 at $3,400/MT for 100 MT (last price to this customer shows on the line) → Quotation Sent.
7. **Revise Quote** → v2 at $3,500/MT with 8% discount → *Requires Approval* → Submit for Approval → Sales Manager → Management approves (mobile) → Negotiation → Customer Approval (onboarding checklist created).
8. PO Received with PO number/date/100 MT → **Order** created automatically with the quote price → Activate → opportunity **Closed Won** → **Send to SAP (Simulated)** → SAP order number, status, integration logs.
9. Account 360 → last purchase, expected reorder; **Global Ingredients UK** shows the 90-day cadence, *Due* status, follow-up task and pre-filled Repeat opportunity; **Mumbai Sweets** is *Overdue*.
10. Cases → complaint on batch CMP-2607-031 routed to the Quality Team; Dashboards → Apex Sales Management / Apex Sample Management.

## Known limitations and honesty rules

* **SAP is simulated.** `Send to SAP (Simulated)` writes mock values and integration logs. Nothing is sent anywhere.
* **AI** (Agentforce / Einstein) is not part of this workstream's metadata; nothing here claims AI capability.
* Validation rules and thresholds marked **DEMO / TO VALIDATE** (discount threshold, approval hierarchy, payment and delivery
  terms, onboarding checklist areas, sample approval quantity limit, reorder logic, close-date default, margin source) are
  configurable examples, not confirmed Apex business rules. See docs/05-open-validate-phase2.md.
* Deploying `OpportunityStage` and `QuoteStatus` standard value sets replaces the org's stage/status lists (legacy stages are
  kept inactive). Deploy to a demo org, not to a production org with live pipeline.
* Deploying the standard layouts (Account, Opportunity, Quote, Order, Case) overwrites the org's default layouts.
* The first deployment to a Developer Edition org surfaced 45 component errors (lookup delete constraints, layout required flags, formula-field reads in before-save flows, report column names); all were fixed in the build. This project was otherwise validated structurally (metadata conversion + cross-reference checks) without an org
  connection in the build environment. Deploy with
  `scripts/deploy.sh`; any component-level deployment error will name the component and can be fixed in place.

## Git / merge rules (from the build brief)

* Person 2 work is isolated in this project; no Person 1 OCR / card-scanning components are touched.
* Lead API names are a contract (see above). Everything else is grouped by feature under `force-app/main/default`.
* Before merging with Person 1, run the full golden demo with the shared lead *ABC Foods International* (`loadGoldenLead.apex`).
