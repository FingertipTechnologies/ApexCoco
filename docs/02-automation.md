# 2. Automation Specification

All automation is declarative Flow except one Apex invocable (lead conversion, which Flow cannot do natively).
Every DML element in a flow has a fault connector: record-triggered flows raise a visible custom error
("Apex … automation could not complete: <fault>"), screen flows show a fault screen. No flow creates duplicate opportunities,
orders, onboarding records or tasks: each one checks for an existing record first.

## Record-triggered flows

| Flow | Object / trigger | Logic | Outcome |
|---|---|---|---|
| `Apex_Sample_Request_Before_Save` | Sample_Request__c, before create/update | Defaults Requested Date; Iteration = parent iteration + 1; inherits account/contact/opportunity/product from the parent iteration; Status ↔ Result sync (*Feedback Received* + Result Approved/Rejected → Status Approved/Rejected; Status Approved/Rejected → Result); milestone dates (Prepared, Dispatch, Feedback Due = today + `Feedback_Follow_Up_Days__c`, Feedback Received, Approval); new samples above `Sample_Approval_Quantity_Limit_KG__c` start at *Approval Pending* | Clean data without extra clicks |
| `Apex_Sample_Request_After_Create` | Sample_Request__c, after create | If Opportunity__c is blank: find an **open** opportunity for the same Account + Primary Product (newest) and link it, else create the opportunity at **Sample Requested** (name = Account - Product, close date = today + `Default_Close_Days__c`, lead fields copied from the source lead). Then recounts samples, writes *Latest Sample Status* on the opportunity and creates the "Prepare sample …" task | One commercial opportunity per account + product; sample request = buying signal |
| `Apex_Sample_Request_After_Update` | Sample_Request__c, after update | Always refreshes the opportunity sample count / latest status. **Dispatched** (was not): opportunity at Sample Requested → *Sample Testing*, next action set. **Customer Testing** (was not): feedback follow-up task (due Feedback Due Date). **Result → Approved**: opportunity gets Sample Approved Date, stage → *Sample Approved* if still at Sample Requested/Testing (otherwise unchanged), Technical Evaluation Status = Pending, task "Schedule technical evaluation", custom notification to the opportunity owner. **Result → Rejected**: opportunity **not closed**, its Next Action / date copied from the sample, task "Agree revised specification and send sample #n+1", notification "Sample rejected - opportunity stays open" | Rejected sample never destroys the relationship |
| `Apex_Opportunity_Before_Save` | Opportunity, before create/update | Customer Approval Date defaults when the stage reaches Customer Approval / PO Received / Closed Won; Opportunity Type default New Business; counter fields default 0 | Data hygiene |
| `Apex_Opportunity_After_Save` | Opportunity, after update (stage change) | **Quotation Sent**: task "Follow up on quotation" (+5 days). **Customer Approval**: creates `Customer_Onboarding__c` (if none) + onboarding task. **PO Received / Closed Won**: creates the **Order** (Draft, PO number/date, effective date = PO date, standard price book) + **Order Product** (primary product, PO quantity, unit price = latest quote line for this account + product, else price book) + "Activate order and send to SAP" task; visible error if the product has no standard price book entry. **Closed Lost**: re-engagement task in 90 days with the loss details | Won criteria and order readiness without double entry |
| `Apex_Quote_Before_Save` | Quote, before create/update | Version defaults to 1, Quote Date defaults to today, Approval Status reset to *Not Required* when the discount no longer needs approval, resolves `Sales_Manager_Approver__c` (owner's manager, else owner) and `Management_Approver__c` (custom metadata username, else manager's manager, else sales manager approver) | Approval process always has resolvable approvers |
| `Apex_Quote_After_Save` | Quote, after create/update | Recounts quotes on the opportunity (`Quote_Count__c`, used by stage validation) and sets the opportunity next action when a quote is Sent / Accepted | Stage gates work |
| `Apex_Quote_Line_Item_Before_Save` | QuoteLineItem, before create/update | Stamps `Account__c` from the quote; Unit Cost defaults from `Product2.Standard_Cost__c`; Line Cost = unit cost × quantity (rolled up to Quote Total Cost → margin); **Last Price to This Customer** / date from the most recent line for the same account + product on another quote | Pricing history on every line |
| `Apex_Quote_Line_Item_After_Save` | QuoteLineItem, after create/update | Opportunity `Latest_Quote_Price__c` = line unit price | Path / highlights show the current price |
| `Apex_Order_After_Save` | Order, after create/update (Status → Activated) | Account roll-up: Last Purchase Date, Last Order Value, Last Purchased Product, Average Reorder Interval (days between the two latest activated orders, else `Default_Reorder_Interval_Days__c`), Expected Reorder Date, Orders in last 12 months. If the linked opportunity is at PO Received → **Closed Won** | Repeat-business engine fed automatically |
| `Apex_Customer_Onboarding_Before_Save` | Customer_Onboarding__c | Status derived from the five checklist areas: all Complete/Not Required → Complete (+ Completed Date); any progress → In Progress; On Hold preserved | Checklist drives status |
| `Apex_Customer_Onboarding_After_Save` | Customer_Onboarding__c | Copies Status to `Account.Onboarding_Status__c` | Visible on Customer 360 |
| `Apex_Case_Before_Save` | Case, before create | Cases with a Complaint Type are owned by the **Quality Team** queue; Quality complaints default to High priority | Complaint routing |

## Scheduled flows (daily)

| Flow | Scope | Logic |
|---|---|---|
| `Apex_Opportunity_Stale_Check` (02:00 UTC) | Open opportunities | `Days_Since_Last_Activity__c` > `Stale_Opportunity_Days__c` and no open "Stale opportunity follow-up" task → create one High-priority task for the owner |
| `Apex_Account_Reorder_Follow_Up` (03:00 UTC) | Accounts with an Expected Reorder Date | Expected Reorder Date ≤ today + `Reorder_Lead_Days__c` (or overdue): one "Repeat order follow-up" task and one open **Repeat** opportunity (stage Pricing Discussion, last product, last order value, close date = expected reorder date) if none exist |

## Screen flows (quick actions)

| Action | Object | Flow | Steps |
|---|---|---|---|
| Request Sample | Lead | `Apex_Lead_Request_Sample` | Screen (product, spec, quantity, unit, date, notes) → mark lead Sample Requested / date / next action → Apex `LeadSampleConversionService` (convert to Account + Contact, no standard opportunity, reuse an Account with the same company name and a Contact with the same email) → map Customer Type / Business Type to the account → find open opportunity for account + product or create it at Sample Requested with the lead's volume, unit, timeline, supplier, competitor, source → create Sample Request #1 → confirmation |
| New Sample Iteration | Sample Request | `Apex_Sample_Request_New_Iteration` | Screen (revised specification, quantity, unit, notes) → creates iteration n+1 linked by Parent Sample Request, same account/contact/opportunity/product, status Requested |
| Revise Quote | Quote | `Apex_Quote_Revise` | Screen (reason, optional new unit price for all lines, discount %) → new Quote version n+1 (Previous Quote = this one, same terms, competitor context, price book) → clones all lines → marks this version *Revised* → confirmation |
| Send to SAP (Simulated) | Order | `Apex_Order_Send_To_SAP` | Screen shows the payload summary and lets the presenter choose the simulated response (Acknowledged / In Production / Dispatched / Invoiced) → outbound Integration Log (Sent) → Order SAP fields (SAP SO = "45" + order number, invoice = "90" + order number when Invoiced, status, timestamp) → inbound Integration Log (Acknowledged) → result screen. Every screen and record is labelled DEMO / simulated |
| New Sample Request | Account, Opportunity | standard Create actions | Pre-fills Account (and Opportunity); the after-create flow does the rest |
| Log Competitor Intel | Opportunity | standard Create action | Pre-fills Account and Product |

## Approval process — `Apex_Quote_Discount_Approval` (DEMO)

* Entry: `Requires_Approval__c` = Discount > `Apex_Demo_Setting__mdt.Default.Discount_Threshold_Percent__c` (5% by default).
* Step 1 *Sales Manager Approval*: related user `Sales_Manager_Approver__c`. Step 2 *Management Approval*: related user `Management_Approver__c`; rejection rejects the request.
* Actions: submission → Approval Status *Pending Approval*; final approval → *Approved*; rejection → *Rejected*; recall → *Not Required*.
* Guardrail: validation rule `VR_Sent_Requires_Approval` blocks Status Sent / Presented / Accepted while approval is required and not granted.
* Mobile approval enabled. Record editability: admin or current approver.

## Apex

`LeadSampleConversionService` (invocable, category "Apex Coco"): input Lead Id; output Account Id, Contact Id, flags and message.
`Database.convertLead` with `setDoNotCreateOpportunity(true)`; reuses an existing Account with the same company name and a
Contact with the same email; already-converted leads return their converted ids. `LeadSampleConversionServiceTest` covers
the new-customer, existing-customer and already-converted paths.

## Custom metadata — `Apex_Demo_Setting__mdt.Default`

| Field | Default | Used by |
|---|---|---|
| Discount_Threshold_Percent__c | 5 | Quote `Requires_Approval__c`, approval entry |
| Stale_Opportunity_Days__c | 30 | Opportunity `Is_Stale__c`, stale-check flow |
| Reorder_Lead_Days__c | 15 | Account `Reorder_Status__c`, reorder follow-up flow |
| Default_Reorder_Interval_Days__c | 90 | Order after-save (first order) |
| Default_Close_Days__c | 90 | Opportunity close date when created from a sample request |
| Feedback_Follow_Up_Days__c | 7 | Sample feedback due date |
| Sample_Approval_Quantity_Limit_KG__c | 10 | Sample *Approval Pending* rule |
| Management_Approver_Username__c | blank | Quote management approver |

## Notifications

Custom notification type `Apex_Sample_Notification` (desktop + mobile) is sent to the opportunity owner on sample approval and
rejection, with the sample as the target record.
