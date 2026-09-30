# 4. Test Checklist (configuration tests)

Run after `scripts/deploy.sh <org> --with-lead-contract --data` and `loadGoldenLead.apex`. Tick each row in the target org.

| ID | Scenario | Steps | Expected result | Enforced by |
|---|---|---|---|---|
| T01 | Qualified Lead creates Sample Request | Lead *ABC Foods International* → Request Sample | Lead converted; Sample Request with account, contact, product, quantity | `Apex_Lead_Request_Sample`, `LeadSampleConversionService` |
| T02 | Sample Request creates Opportunity | T01, or Account → New Sample Request | Opportunity *Account - Product* at Sample Requested, owner = sample owner, task created | `Apex_Sample_Request_After_Create` |
| T03 | No duplicate Opportunity | Second Sample Request for the same account + product | Linked to the existing open opportunity; count = 2 | `Apex_Sample_Request_After_Create` |
| T04 | Dispatch without tracking | Status Dispatched, courier/tracking blank | Save blocked | `VR_Dispatch_Requires_Courier_Tracking` |
| T05 | Dispatch with tracking | Courier + tracking filled | Saved; Dispatch Date defaulted; opportunity → Sample Testing | before-save + after-update flows |
| T06 | Feedback without text | Status Feedback Received, feedback blank | Blocked | `VR_Feedback_Requires_Text` |
| T07 | Reject without reason | Result Rejected, reason blank | Blocked | `VR_Rejected_Requires_Reason` |
| T08 | Reject Sample 1 | Reason + next action filled | Sample Rejected; opportunity open, next action copied, task + notification | `Apex_Sample_Request_After_Update` |
| T09 | Create Sample 2 | New Sample Iteration | Iteration 2, parent = sample 1, same opportunity; both in related lists | `Apex_Sample_Request_New_Iteration` |
| T10 | Approve Sample 2 | Feedback + Result Approved | Opportunity Sample Approved Date set, stage Sample Approved, task, notification | `Apex_Sample_Request_After_Update` |
| T11 | Quote created | New Quote + line | Opportunity Quote Count = 1, Latest Quote Price = line price, line Account stamped, cost/margin populated | Quote / QLI flows |
| T12 | Quote revised | Revise Quote | Version 2 with lines, Previous Quote set, v1 Status Revised, Last Price to This Customer on v2 line | `Apex_Quote_Revise`, QLI before-save |
| T13 | Excessive discount | Discount 8% → Status Sent | Blocked until approved; Submit for Approval routes Sales Manager → Management; Approval Status updates | approval process + VR |
| T14 | PO Received without PO data | Stage PO Received, PO blank | Blocked | `VR_PO_Received_Needs_PO` |
| T15 | PO Received complete | PO number, date, quantity | Order (Draft) + Order Product with quote price; task | `Apex_Opportunity_After_Save` |
| T16 | Closed Lost without reason | Stage Closed Lost | Blocked; with reason → re-engagement task | VR + flow |
| T17 | Stale Opportunity | Sunrise Beverages opportunity (last activity 45 days ago) | `Is_Stale__c` true, list view *Apex Stale Opportunities*; scheduled flow (debug run) creates one task, second run creates none | formula + `Apex_Opportunity_Stale_Check` |
| T18 | Reorder date approaching | Global Ingredients UK (Due) / Mumbai Sweets (Overdue) | Scheduled flow (debug run) creates task + Repeat opportunity once | `Apex_Account_Reorder_Follow_Up` |
| T19 | Mock SAP event | Order → Send to SAP (Simulated) | SAP fields on the order, outbound + inbound Integration Logs, all labelled Mock (Demo) | `Apex_Order_Send_To_SAP` |
| T20 | Person 1 + Person 2 merge | Full golden demo from the shared lead | End-to-end journey works with the frozen Lead API names | all |
| T21 | Order activation closes the deal | Activate the order from T15 | Opportunity Closed Won; account last purchase / expected reorder set | `Apex_Order_After_Save` |
| T22 | Onboarding | Move to Customer Approval; complete all checklist areas | Onboarding record auto-created; Status Complete + Completed Date; Account Onboarding Status Complete | onboarding flows |
| T23 | Complaint routing | New Case with Complaint Type Quality | Owner = Quality Team queue, Priority High | `Apex_Case_Before_Save` |
| T24 | Apex unit tests | `sf apex run test --tests LeadSampleConversionServiceTest` | 3 methods pass | test class |
| T25 | Permission sets | Log in as each demo role | Apex Sales app visible; tabs and fields per role | permission sets |
