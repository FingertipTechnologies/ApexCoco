# 5. DEMO / OPEN / VALIDATE items and Phase 2

Nothing below is presented to Apex as a confirmed business rule. Each is a configurable example in the build.

## OPEN / VALIDATE with Apex

| Topic | Where it lives in the build | Status |
|---|---|---|
| Internal sample approval rule (which samples need approval, by whom) | `Sample_Approval_Quantity_Limit_KG__c` (10 KG) → Status *Approval Pending* | OPEN / VALIDATE |
| Quote approval hierarchy (BE → BDM → Sales Manager → Management?) | 2-step approval process, approvers resolved by flow; a BDM step can be added as step 1 | OPEN / VALIDATE |
| Discount / margin thresholds | `Discount_Threshold_Percent__c` (5%) | OPEN / VALIDATE |
| Margin calculation source | `Product2.Standard_Cost__c` (DEMO) → line cost → quote margin | VALIDATE |
| Payment terms | Quote `Payment_Terms__c` picklist (DEMO values) | OPEN / VALIDATE |
| Delivery terms / Incoterms | Quote `Delivery_Terms__c` picklist | OPEN / VALIDATE |
| Onboarding / statutory documents per area | `Customer_Onboarding__c` five checklist areas (placeholders) | OPEN / VALIDATE |
| Technical evaluation fields and documents | `Technical_Evaluation_Status__c` only | VALIDATE |
| Reorder calculation logic | interval between the two most recent activated orders; default 90 days; lead time 15 days | VALIDATE |
| Sales-cycle / close-date formula | `Default_Close_Days__c` (90) used only to default the close date | VALIDATE |
| Order activation / fulfilment process | Order Draft → Activated (manual) | VALIDATE |
| SAP system-of-record boundaries, interface and API | simulated handoff + integration log | PHASE 2 / VALIDATE |
| Sample rejection reasons list | `Rejection_Reason__c` values | VALIDATE |
| Stale-opportunity period | `Stale_Opportunity_Days__c` (30) | VALIDATE |
| Courier list, tracking links | free text + generic tracking search link | VALIDATE |

## Phase 2 / productionisation candidates

* Real SAP integration (MuleSoft / SAP Integration Suite): authentication, mapping, retries, monitoring, stock / ATP field, invoice and dispatch status back to the order.
* Customer / partner master synchronisation with SAP.
* Advanced pricing engine with approved Apex cost and price sources; supply-period pricing per end customer.
* Contract / BOQ and document management (COA, packing list, BL) with a repository integration.
* Sample inventory / batch integration with production.
* Production email-to-case and service SLAs; CAPA tracking.
* AI (opportunity summaries, price history assistant, lead scoring) where the licence supports it.
* Production vs demand forecasting fed by SAP production plans.
* Enterprise sharing / security redesign; audit and integration observability.
* Distributors, super stockists and field sales (outside the B2B pilot scope).
