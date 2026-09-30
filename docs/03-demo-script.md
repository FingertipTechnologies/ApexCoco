# 3. Golden Demo Script — click by click

Presenter rules: one customer (ABC Foods International) from start to finish; Apex vocabulary (MT, batch, COA, importer, BE,
Sales Admin); every screen answers a documented Apex problem; say "simulated" for SAP and "DEMO / to validate" for thresholds.

Org state before the run: `resetDemoData.apex` + the four `loadDemoData_*.apex` scripts (+ `loadGoldenLead.apex` for the merged run). Log in as
the Sales Executive for steps 1–11, switch to Sales Manager / Management for the approval, Sales Admin for the SAP step.

| # | Screen / action | What to say | Apex problem answered |
|---|---|---|---|
| 1 | **Apex Sales** app → Accounts → *ABC Foods International* | "One customer page: contacts, the January price discussion in the activity history, Competitor A at $3,400 in Competitor Intel. There is **no opportunity** yet: a price request is not an opportunity at Apex." | Fragmented Excel / Zoho; fake pipeline |
| 1b (merged run) | Leads → *Michael Anderson, ABC Foods International* → **Request Sample** | "Person 1 qualified this lead from the visiting card. R&D has now asked for samples, so we convert it. Notice the confirmation: *existing customer relationship found* — no duplicate account." | Duplicate customers via two channels |
| 2 | Account → **New Sample Request** (Contact: Laura Chen, Product: Coconut Milk Powder, 5 KG, spec "spray-dried, 55–60% fat") | "The sample request is the buying signal. Watch the opportunity appear automatically at **Sample Requested**, and the preparation task for Sales Admin." | Samples outside CRM; opportunity timing |
| 3 | Opportunity *ABC Foods International - Coconut Milk Powder* | Path, highlights (product, 500 MT, latest sample status), Sample Requests related list. "This is the single record the whole journey hangs off." | Long cycle visibility |
| 4 | Sample Requests tab → list view **Sales Admin - To Prepare / Dispatch** → SMPREQ-… → Path *Prepared*, batch `CMP-2610-041` | "Sales Admin works from a queue, not WhatsApp messages. The batch number links quality history to the sample." | Sample control |
| 5 | Path *Dispatched* → **Save without tracking** | Validation blocks: "Courier partner and tracking number are required…". Add DHL + `DHL7782230015` → save. "The opportunity moved itself to **Sample Testing**." | Lost samples, no tracking |
| 6 | Path *Customer Testing* | "A follow-up task appears for day 7. Feedback Due Date is set." | Samples waiting too long |
| 7 | Path *Feedback Received*: feedback "Texture: clumping and greasy mouthfeel on reconstitution", Result **Rejected** → save without reason | Blocked: reason required. Reason *Texture / Specification*, next action "Send revised sample: finer particle size, anti-caking, 55% fat" → save. | Rejected = lost in Zoho |
| 8 | Back on the opportunity | "Still **open**. Next action copied from the sample. The owner got a notification and a task: *Agree revised specification and send sample #2*." | The differentiator |
| 9 | Sample → **New Sample Iteration** (revised spec) → new SMPREQ-…, iteration 2 → Prepared → Dispatched (FedEx `FX441121870`) → Customer Testing → Feedback Received, feedback "Reconstitution and mouthfeel approved by R&D", Result **Approved** | "Iteration 2 sits under iteration 1 in *Sample Iterations*. Approval set the **Sample Approved Date** and moved the opportunity to **Sample Approved**; a technical-evaluation task was created." | Iteration history |
| 10 | Opportunity Path *Technical Evaluation* (status Complete) → *Pricing Discussion* | "The Path shows the last price to this customer and competitor context before we quote." | Pricing without history |
| 11 | Quotes related list → **New Quote** "ABC Foods - CMP 100 MT", Coconut Milk Powder × 100 MT @ $3,400, payment/delivery terms, competitor $3,400 → Status Sent → stage *Quotation Sent* | "Margin is calculated from the DEMO standard cost. Quotation Sent needs a quote: the gate is enforced." | Quotes in Excel |
| 12 | Quote → **Revise Quote**: reason "customer counter-offer", new unit price 3,500, line discount 8% | "Version 2 is created, version 1 is kept as *Revised*. The line shows *Last Price to This Customer: 3,400*. Discount 8% > 5% DEMO threshold → **Requires Approval**." Try Status Sent → blocked. | Lost quote iterations |
| 13 | **Submit for Approval** → log in as Sales Manager → approve → Management approves on the phone | "Approval history is on the quote. The chain BE → Sales Manager → Management is configurable; Apex confirms the real thresholds." | Who approved what price |
| 14 | Opportunity → *Negotiation* → *Customer Approval* | "Customer Approval Date set, **onboarding checklist** created with owners for company, finance, quality, logistics, compliance (placeholders to validate)." | Onboarding by email |
| 15 | Opportunity → *PO Received* without PO → blocked. PO `ABC-PO-2026-117`, PO date today, 100 MT → save | "The **Order** was created with the quote price and the PO. Task: activate and send to SAP." | Double entry |
| 16 | Order → **Activate** → opportunity is **Closed Won** | "Won means PO + activated order, not a manual click." | Won criteria |
| 17 | Order → **Send to SAP (Simulated)** → choose *Acknowledged* | "This is a labelled simulation: outbound payload, inbound SAP sales order number, integration log. Sales never logs in to SAP. The real interface is Phase 2." | SAP integration |
| 18 | Account 360 (ABC Foods) | "Last purchase, expected reorder, onboarding status, samples, quotes, orders, competitor intel, cases: one page." | Account 360 |
| 19 | Accounts → **Global Ingredients UK** | "Orders every 90 days (Jan/Apr/Jul pattern), *Reorder Status: Due*, the follow-up task and a pre-filled **Repeat** opportunity created by the scheduled flow. **Mumbai Sweets** is *Overdue*." | Repeat business by hand |
| 20 | Cases → *Off-odour in 3 bags of lot CMP-2607-031* | "Complaint on product + batch + order, owned by the **Quality Team** queue, visible on the account before the next quote." | Complaints in Excel |
| 21 | Dashboards → **Apex Sales Management**, **Apex Sample Management** | "Pipeline by Apex stage, won/lost with loss reasons, quotes by status, stale deals by owner, samples by status and aging, rejections by reason, reorder status." | Management visibility |

## Negative / proof-of-value scenarios (all enforced by deployed rules)

| Scenario | Expected |
|---|---|
| Dispatch a sample without courier or tracking | Blocked: `VR_Dispatch_Requires_Courier_Tracking` |
| Feedback Received without feedback text or result | Blocked: `VR_Feedback_Requires_Text` / `VR_Feedback_Requires_Result` |
| Reject without reason / next action | Blocked: `VR_Rejected_Requires_Reason` / `VR_Rejected_Requires_Next_Action` |
| Approve without feedback | Blocked: `VR_Approved_Requires_Feedback` |
| Reject sample 1 | Opportunity stays open; task + notification; iteration 2 links to the same opportunity |
| Move opportunity to Sample Approved / later stages without an approved sample | Blocked: `VR_Later_Stages_Need_Approved_Sample` |
| Quotation Sent / Negotiation / Customer Approval without a quote | Blocked: `VR_Quotation_Stages_Need_Quote` |
| Send a quote whose discount exceeds the DEMO threshold without approval | Blocked: `VR_Sent_Requires_Approval` |
| PO Received / Closed Won without PO number and date | Blocked: `VR_PO_Received_Needs_PO` |
| Closed Lost without loss reason | Blocked: `VR_Closed_Lost_Needs_Reason`; with reason → re-engagement task in 90 days |
| Create a second Sample Request for the same account + product | Linked to the existing open opportunity, no duplicate |
| Request Sample on a lead whose company already exists | Attached to the existing account (no duplicate customer) |
| Opportunity with no activity for 30 days (Sunrise Beverages in the demo data) | `Is_Stale__c` = true, list view *Apex Stale Opportunities*, task after the scheduled flow runs |
| Account past its expected reorder date (Mumbai Sweets) | Reorder Status *Overdue*, task + repeat opportunity after the scheduled flow runs |
| Order for a product with no standard price book entry | Visible error naming the cause; nothing half-created |

## Morning-of-demo checklist

* Org reset and reloaded; ABC Foods has no opportunity (and, for the merged run, the golden lead exists).
* Logins tested for Sales Executive, Sales Manager, Sales Admin, Management; Manager field and management username set.
* Approval notification arriving on the Management user's phone.
* Scheduled flows run once (Flow Builder → Debug) so the Global Ingredients task and repeat opportunity exist.
* Dashboards refreshed.
