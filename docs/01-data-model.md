# 1. Data Model and Field Inventory (generated from metadata)

Objects, fields, API names, types and picklist values exactly as deployed. Regenerate with the build scripts if metadata changes.

## Object model

```
Account 1 ──< Contact
Account 1 ──< Opportunity (Primary_Product__c ► Product2)
Account 1 ──< Sample_Request__c >── 1 Opportunity     (Product__c ► Product2, Contact__c ► Contact, Lead__c ► Lead)
Sample_Request__c 1 ──< Sample_Request__c (Parent_Sample_Request__c: iteration chain)
Opportunity 1 ──< Quote 1 ──< QuoteLineItem (Account__c stamped by flow for price history)
Quote 1 ──< Quote (Previous_Quote__c: version chain)
Opportunity 1 ──< Competitor_Intel__c >── 1 Account   (Product__c ► Product2)
Opportunity 1 ──< Customer_Onboarding__c >── 1 Account
Opportunity 1 ──< Order 1 ──< OrderItem
Order 1 ──< Integration_Log__c  (simulated SAP handoff audit trail)
Order 1 ──< Case (Product__c ► Product2, Batch_Number__c)
Apex_Demo_Setting__mdt (Default record): DEMO thresholds used by flows, formulas and validation
Lead (shared contract, owned by Person 1): consumed by the Request Sample flow, never renamed
```

## Sample_Request__c (custom, Person 2 primary object)

Name field: **Sample Request Number** (AutoNumber, SMPREQ-{0000})

| Field | API Name | Type | Required | Notes / Picklist values |
|---|---|---|---|---|
| Account | `Account__c` | Lookup | Yes | ► Account (child relationship Sample_Requests__r) |
| Approval Date | `Approval_Date__c` | Date |  |  |
| Batch Number | `Batch_Number__c` | Text |  | length 50 |
| Closure Reason | `Closure_Reason__c` | Text |  | length 255 — Required when the status is Closed. |
| Contact | `Contact__c` | Lookup | Yes | ► Contact (child relationship Sample_Requests__r) |
| Courier Partner | `Courier_Partner__c` | Text |  | length 100 — Required when the status is Dispatched. |
| Customer Feedback | `Customer_Feedback__c` | LongTextArea |  | length 32768 — Required when the status is Feedback Received and before a sample can be approved. |
| Days Pending Feedback | `Days_Pending_Feedback__c` | Formula (Number) |  | `IF(ISPICKVAL(Status__c, "Customer Testing"), TODAY() - BLANKVALUE(Dispatch_Date__c, Requested_Date__c), 0)` |
| Days Since Request | `Days_Since_Request__c` | Formula (Number) |  | `TODAY() - Requested_Date__c` |
| Dispatch Date | `Dispatch_Date__c` | Date |  |  |
| Expected Delivery | `Expected_Delivery__c` | Date |  |  |
| Feedback Due Date | `Feedback_Due_Date__c` | Date |  |  |
| Feedback Received Date | `Feedback_Received_Date__c` | Date |  |  |
| Is Open | `Is_Open__c` | Formula (Checkbox) |  | `NOT(OR(ISPICKVAL(Status__c, "Approved"), ISPICKVAL(Status__c, "Rejected"), ISPICKVAL(Status__c, "Closed")))` |
| Iteration Number | `Iteration_Number__c` | Number | Yes | 3,0 — default 1 |
| Source Lead | `Lead__c` | Lookup |  | ► Lead (child relationship Sample_Requests__r) — Retains the qualified Lead supplied by Person 1 (Visiting Card -> Lead). |
| Next Action Date | `Next_Action_Date__c` | Date |  |  |
| Next Action | `Next_Action__c` | Text |  | length 255 — Required when a sample is rejected. |
| Notes | `Notes__c` | LongTextArea |  | length 32768 |
| Opportunity | `Opportunity__c` | Lookup |  | ► Opportunity (child relationship Sample_Requests__r) — Commercial context. Populated automatically by the flow Apex_Sample_Request_After_Create when left blank. |
| Parent Sample Request | `Parent_Sample_Request__c` | Lookup |  | ► Sample_Request__c (child relationship Sample_Iterations__r) — Links iteration 2, 3... back to the previous sample for the same opportunity. |
| Prepared Date | `Prepared_Date__c` | Date |  |  |
| Product | `Product__c` | Lookup | Yes | ► Product2 (child relationship Sample_Requests__r) |
| Rejection Reason | `Rejection_Reason__c` | Picklist |  | Texture / Specification, Taste, Colour, Moisture, Particle Size, Fat Content, Microbiology, Packaging, Price, Other |
| Requested Date | `Requested_Date__c` | Date | Yes |  — default TODAY() |
| Result | `Result__c` | Picklist |  | Pending, Approved, Rejected |
| Sample Quantity | `Sample_Quantity__c` | Number | Yes | 16,2 |
| Sample Unit | `Sample_Unit__c` | Picklist | Yes | KG, G, Other |
| Specification / Grade | `Specification__c` | Text |  | length 255 — Spec or grade requested by the customer. Change it on the next iteration when the customer asks for an adjustment. |
| Status | `Status__c` | Picklist | Yes | Requested, Approval Pending, Prepared, Dispatched, Customer Testing, Feedback Received, Approved, Rejected, Closed |
| Tracking Link | `Tracking_Link__c` | Formula (Text) |  | `IF(ISBLANK(Tracking_Number__c), "", HYPERLINK("https://www.google.com/search?q=" & Tracking_Number__c, "Track " & Tracking_Number__c, "_blank"))` |
| Tracking Number | `Tracking_Number__c` | Text |  | length 100 — Required when the status is Dispatched. |

## Competitor_Intel__c (custom)

Name field: **Intel Number** (AutoNumber, CI-{0000})

| Field | API Name | Type | Required | Notes / Picklist values |
|---|---|---|---|---|
| Account | `Account__c` | Lookup |  | ► Account (child relationship Competitor_Intel__r) |
| Competitor | `Competitor_Name__c` | Text | Yes | length 100 |
| Customer Preference | `Customer_Preference__c` | Text |  | length 255 |
| Intel Date | `Intel_Date__c` | Date |  |  — default TODAY() |
| Notes | `Notes__c` | LongTextArea |  | length 32768 |
| Opportunity | `Opportunity__c` | Lookup |  | ► Opportunity (child relationship Competitor_Intel__r) |
| Price Unit | `Price_Unit__c` | Picklist |  | per MT, per KG |
| Product | `Product__c` | Lookup |  | ► Product2 (child relationship Competitor_Intel__r) |
| Competitor Quoted Price | `Quoted_Price__c` | Currency |  | 18,2 |
| Source | `Source__c` | Picklist |  | Customer Discussion, Trade Show, Port Data, Website, LinkedIn, Other |
| Strength | `Strength__c` | Text |  | length 255 |
| Weakness | `Weakness__c` | Text |  | length 255 |

## Customer_Onboarding__c (custom)

Name field: **Onboarding Number** (AutoNumber, ONB-{0000})

| Field | API Name | Type | Required | Notes / Picklist values |
|---|---|---|---|---|
| Account | `Account__c` | Lookup | Yes | ► Account (child relationship Customer_Onboardings__r) |
| Company Information Owner | `Company_Information_Owner__c` | Picklist |  | Sales Admin, Finance, Quality, Operations, Compliance, Sales Executive |
| Company Information Status | `Company_Information_Status__c` | Picklist |  | Pending, In Progress, Complete, Not Required |
| Completed Date | `Completed_Date__c` | Date |  |  |
| Completion % | `Completion_Percent__c` | Formula (Percent) |  | `(IF(OR(ISPICKVAL(Company_Information_Status__c, "Complete"), ISPICKVAL(Company_Information_Status__c, "Not Required")), 1, 0) + IF(OR(ISPICKVAL(Finance_Status__c, "Complete"), ISPICKVAL(Finance_Status__c, "Not Required")), 1, 0) + IF(OR(ISPICKVAL(Quality_Status__c, "Complete"), ISPICKVAL(Quality_Status__c, "Not Required")), 1, 0) + IF(OR(ISPICKVAL(Logistics_Status__c, "Complete"), ISPICKVAL(Logistics_Status__c, "Not Required")), 1, 0) + IF(OR(ISPICKVAL(Compliance_Status__c, "Complete"), ISPICKVAL(Compliance_Status__c, "Not Required")), 1, 0)) / 5 * 100` |
| Compliance Owner | `Compliance_Owner__c` | Picklist |  | Sales Admin, Finance, Quality, Operations, Compliance, Sales Executive |
| Compliance Status | `Compliance_Status__c` | Picklist |  | Pending, In Progress, Complete, Not Required |
| Due Date | `Due_Date__c` | Date |  |  |
| Finance Owner | `Finance_Owner__c` | Picklist |  | Sales Admin, Finance, Quality, Operations, Compliance, Sales Executive |
| Finance Status | `Finance_Status__c` | Picklist |  | Pending, In Progress, Complete, Not Required |
| Logistics Owner | `Logistics_Owner__c` | Picklist |  | Sales Admin, Finance, Quality, Operations, Compliance, Sales Executive |
| Logistics Status | `Logistics_Status__c` | Picklist |  | Pending, In Progress, Complete, Not Required |
| Notes | `Notes__c` | LongTextArea |  | length 32768 — DEMO / TO VALIDATE: exact statutory documents per checklist area are to be confirmed by Apex. |
| Opportunity | `Opportunity__c` | Lookup |  | ► Opportunity (child relationship Customer_Onboardings__r) |
| Quality Owner | `Quality_Owner__c` | Picklist |  | Sales Admin, Finance, Quality, Operations, Compliance, Sales Executive |
| Quality Status | `Quality_Status__c` | Picklist |  | Pending, In Progress, Complete, Not Required |
| Status | `Status__c` | Picklist |  | Not Started, In Progress, Complete, On Hold |

## Integration_Log__c (custom, DEMO SAP audit trail)

Name field: **Integration Id** (AutoNumber, INT-{00000})

| Field | API Name | Type | Required | Notes / Picklist values |
|---|---|---|---|---|
| Direction | `Direction__c` | Picklist |  | Outbound, Inbound |
| Error Message | `Error_Message__c` | Text |  | length 255 |
| Integration Mode (DEMO) | `Integration_Mode__c` | Picklist |  | Mock (Demo), Live |
| Opportunity | `Opportunity__c` | Lookup |  | ► Opportunity (child relationship Integration_Logs__r) |
| Order | `Order__c` | Lookup |  | ► Order (child relationship Integration_Logs__r) |
| Payload Summary | `Payload_Summary__c` | LongTextArea |  | length 32768 |
| Record Type | `Record_Type_Name__c` | Text |  | length 50 — Salesforce object that was sent (for example Order). |
| Response Summary | `Response_Summary__c` | LongTextArea |  | length 32768 |
| Retry Count | `Retry_Count__c` | Number |  | 3,0 — default 0 |
| Salesforce Record Id | `Salesforce_Record_Id__c` | Text |  | length 18 |
| Sent Date/Time | `Sent_Date_Time__c` | DateTime |  |  |
| Status | `Status__c` | Picklist |  | Not Sent, Sent, Acknowledged, Error, Mock |
| Target System | `Target_System__c` | Text |  | length 50 — default "SAP ERP" |

## Apex_Demo_Setting__mdt (custom metadata type, record "Default")

| Field | API Name | Type | Required | Notes / Picklist values |
|---|---|---|---|---|
| Default Opportunity Close Days (DEMO) | `Default_Close_Days__c` | Number |  | 5,0 — DEMO / TO VALIDATE. Used only to default the Close Date of an opportunity created from a sample request. |
| Default Reorder Interval Days | `Default_Reorder_Interval_Days__c` | Number |  | 5,0 |
| Discount Threshold % (DEMO) | `Discount_Threshold_Percent__c` | Number |  | 5,2 — DEMO / TO VALIDATE. Quotes with a discount above this percentage are routed for approval. |
| Sample Feedback Follow-up Days | `Feedback_Follow_Up_Days__c` | Number |  | 5,0 |
| Management Approver Username | `Management_Approver_Username__c` | Text |  | length 255 — Username of the Management approver for quotes. Blank = fall back to the owner's manager chain. |
| Reorder Follow-up Lead Days | `Reorder_Lead_Days__c` | Number |  | 5,0 |
| Sample Approval Quantity Limit (KG) | `Sample_Approval_Quantity_Limit_KG__c` | Number |  | 10,2 — DEMO / TO VALIDATE. New sample requests above this quantity go to Approval Pending. |
| Stale Opportunity Days | `Stale_Opportunity_Days__c` | Number |  | 5,0 |

## Opportunity (standard + Apex fields)

| Field | API Name | Type | Required | Notes / Picklist values |
|---|---|---|---|---|
| Competitor | `Competitor__c` | Text |  | length 100 |
| Current Supplier | `Current_Supplier__c` | Text |  | length 100 |
| Customer Approval Date | `Customer_Approval_Date__c` | Date |  |  |
| Days Since Last Activity | `Days_Since_Last_Activity__c` | Formula (Number) |  | `TODAY() - BLANKVALUE(LastActivityDate, DATEVALUE(CreatedDate))` |
| Expected Annual Volume | `Expected_Annual_Volume__c` | Number |  | 16,2 |
| Is Stale | `Is_Stale__c` | Formula (Checkbox) |  | `NOT(IsClosed) && (TODAY() - BLANKVALUE(LastActivityDate, DATEVALUE(CreatedDate))) > $CustomMetadata.Apex_Demo_Setting__mdt.Default.Stale_Opportunity_Days__c` |
| Latest Quote Price | `Latest_Quote_Price__c` | Currency |  | 18,2 — Maintained by flow from the most recent quote line. |
| Latest Sample Status | `Latest_Sample_Status__c` | Text |  | length 255 — Maintained by flow. |
| Loss Details | `Loss_Details__c` | LongTextArea |  | length 32768 — Context for re-engagement later. |
| Loss Reason | `Loss_Reason__c` | Picklist |  | Price, Sample Rejected, Competitor Selected, No Requirement, Timing, Specification, Other |
| Next Action Date | `Next_Action_Date__c` | Date |  |  |
| Next Action | `Next_Action__c` | Text |  | length 255 |
| Opportunity Type | `Opportunity_Type__c` | Picklist |  | New Business, Repeat, Upsell, Cross-sell |
| PO Date | `PO_Date__c` | Date |  |  |
| PO Number | `PO_Number__c` | Text |  | length 50 |
| PO Quantity | `PO_Quantity__c` | Number |  | 16,2 |
| Primary Product | `Primary_Product__c` | Lookup |  | ► Product2 (child relationship Primary_Product_Opportunities__r) |
| Purchase Timeline | `Purchase_Timeline__c` | Picklist |  | <3 Months, 3-6 Months, 6-12 Months, >12 Months |
| Quotes | `Quote_Count__c` | Number |  | 3,0 — default 0 — Maintained by flow. |
| Sample Approved Date | `Sample_Approved_Date__c` | Date |  |  — Set automatically when a linked sample request is approved. |
| Sample Requests | `Sample_Request_Count__c` | Number |  | 3,0 — default 0 — Maintained by flow. |
| Technical Evaluation Status | `Technical_Evaluation_Status__c` | Picklist |  | Pending, In Progress, Complete |
| Volume Unit | `Volume_Unit__c` | Picklist |  | MT, KG, Other |

## Account (standard + Apex fields)

| Field | API Name | Type | Required | Notes / Picklist values |
|---|---|---|---|---|
| Average Reorder Interval (Days) | `Average_Reorder_Interval_Days__c` | Number |  | 5,0 — DEMO / TO VALIDATE: interval between the two most recent activated orders. |
| Business Type | `Business_Type__c` | Text |  | length 100 |
| Customer Type | `Customer_Type__c` | Picklist |  | Direct Customer, Importer, Brand, Private Label, Distributor/Other |
| Expected Reorder Date | `Expected_Reorder_Date__c` | Date |  |  |
| Last Order Value | `Last_Order_Value__c` | Currency |  | 18,2 |
| Last Purchase Date | `Last_Purchase_Date__c` | Date |  |  — Maintained by flow when an order is activated. |
| Last Purchased Product | `Last_Purchased_Product__c` | Lookup |  | ► Product2 (child relationship Last_Purchased_Accounts__r) |
| Market | `Market__c` | Picklist |  | India, Export |
| Onboarding Status | `Onboarding_Status__c` | Picklist |  | Not Started, In Progress, Complete, On Hold — Maintained by flow from the Customer Onboarding record. |
| Orders (Last 12 Months) | `Orders_Last_12_Months__c` | Number |  | 5,0 |
| Reorder Status | `Reorder_Status__c` | Formula (Text) |  | `IF(ISBLANK(Expected_Reorder_Date__c), "No Orders", IF(Expected_Reorder_Date__c < TODAY(), "Overdue", IF(Expected_Reorder_Date__c - TODAY() <= $CustomMetadata.Apex_Demo_Setting__mdt.Default.Reorder_Lead_Days__c, "Due", "On Track")))` |

## Quote (standard + Apex fields)

| Field | API Name | Type | Required | Notes / Picklist values |
|---|---|---|---|---|
| Approval Status | `Approval_Status__c` | Picklist |  | Not Required, Pending Approval, Approved, Rejected |
| Competitor | `Competitor_Name__c` | Text |  | length 100 |
| Competitor Price | `Competitor_Price__c` | Currency |  | 18,2 |
| Delivery Terms (DEMO) | `Delivery_Terms__c` | Picklist |  | FOB, CIF, CFR, EXW, DDP, Other — DEMO / TO VALIDATE with Apex. |
| Management Approver | `Management_Approver__c` | Lookup |  | ► User (child relationship Management_Approval_Quotes__r) — Set automatically by flow from the Apex Demo Setting or the manager chain. |
| Margin % (DEMO) | `Margin_Percent__c` | Formula (Percent) |  | `IF(TotalPrice > 0, (TotalPrice - Total_Cost__c) / TotalPrice * 100, 0)` |
| Payment Terms (DEMO) | `Payment_Terms__c` | Picklist |  | 30% Advance / 70% against BL, LC at Sight, TT 30 Days, TT 60 Days, Other — DEMO / TO VALIDATE with Apex. |
| Previous Quote Version | `Previous_Quote__c` | Lookup |  | ► Quote (child relationship Revisions__r) |
| Quote Date | `Quote_Date__c` | Date |  |  — Defaults to the creation date; editable for historical demo data. |
| Quote Version | `Quote_Version__c` | Number |  | 3,0 — default 1 |
| Requires Approval | `Requires_Approval__c` | Formula (Checkbox) |  | `BLANKVALUE(Discount, 0) > $CustomMetadata.Apex_Demo_Setting__mdt.Default.Discount_Threshold_Percent__c` |
| Revision Reason | `Revision_Reason__c` | Text |  | length 255 |
| Sales Manager Approver | `Sales_Manager_Approver__c` | Lookup |  | ► User (child relationship Sales_Manager_Approval_Quotes__r) — Set automatically by flow: owner's manager, or the owner when no manager is set. |
| Total Cost (DEMO) | `Total_Cost__c` | Summary |  | SUM of QuoteLineItem.Line_Cost__c |
| Total Margin (DEMO) | `Total_Margin__c` | Formula (Currency) |  | `TotalPrice - Total_Cost__c` |

## QuoteLineItem (standard + Apex fields)

| Field | API Name | Type | Required | Notes / Picklist values |
|---|---|---|---|---|
| Account | `Account__c` | Lookup |  | ► Account (child relationship Quote_Line_Items__r) — Set by flow from the quote, so price history can be reported per customer and product. |
| Last Quoted Date | `Last_Quoted_Date__c` | Date |  |  |
| Last Price to This Customer | `Last_Quoted_Price__c` | Currency |  | 18,2 — Previous quoted unit price for the same account and product. Set by flow. |
| Line Cost (DEMO) | `Line_Cost__c` | Currency |  | 18,2 — Unit Cost x Quantity. Maintained by flow. |
| Margin % (DEMO) | `Margin_Percent__c` | Formula (Percent) |  | `IF(UnitPrice > 0, (UnitPrice - BLANKVALUE(Unit_Cost__c, 0)) / UnitPrice * 100, 0)` |
| Supply Period From | `Supply_Period_From__c` | Date |  |  |
| Supply Period To | `Supply_Period_To__c` | Date |  |  |
| Unit Cost (DEMO) | `Unit_Cost__c` | Currency |  | 18,2 — DEMO / TO VALIDATE: defaults from Product Standard Cost. |

## Order (standard + Apex fields)

| Field | API Name | Type | Required | Notes / Picklist values |
|---|---|---|---|---|
| Integration Mode (DEMO) | `Integration_Mode__c` | Picklist |  | Mock (Demo), Live |
| SAP Invoice No. (DEMO) | `SAP_Invoice_Number__c` | Text |  | length 20 |
| SAP Last Response (DEMO) | `SAP_Last_Response__c` | Text |  | length 255 |
| SAP Sales Order No. (DEMO) | `SAP_Order_Number__c` | Text |  | length 20 |
| SAP Sent Date/Time | `SAP_Sent_Date_Time__c` | DateTime |  |  |
| SAP Status (DEMO) | `SAP_Status__c` | Picklist |  | Not Sent, Sent, Acknowledged, In Production, Dispatched, Invoiced, Error — Simulated. Real SAP integration is Phase 2. |

## Case (standard + Apex fields)

| Field | API Name | Type | Required | Notes / Picklist values |
|---|---|---|---|---|
| Batch Number | `Batch_Number__c` | Text |  | length 50 |
| Complaint Type | `Complaint_Type__c` | Picklist |  | Quality, Packaging, Quantity Shortage, Delivery Delay, Documentation, Other |
| Order | `Order__c` | Lookup |  | ► Order (child relationship Cases__r) |
| Product | `Product__c` | Lookup |  | ► Product2 (child relationship Cases__r) |
| Resolution | `Resolution__c` | LongTextArea |  | length 32768 |

## Product2 (standard + Apex fields)

| Field | API Name | Type | Required | Notes / Picklist values |
|---|---|---|---|---|
| Standard Cost per Unit (DEMO) | `Standard_Cost__c` | Currency |  | 18,2 — DEMO / TO VALIDATE: margin source to be confirmed by Apex. |
| Unit of Measure | `Unit_of_Measure__c` | Text |  | length 10 — default "MT" |

## Lead — shared contract with Person 1 (package directory shared-lead-contract/, frozen API names)

| Field | API Name | Type | Required | Notes / Picklist values |
|---|---|---|---|---|
| Business Type | `Business_Type__c` | Text |  | length 100 |
| Competitor | `Competitor__c` | Text |  | length 100 |
| Current Supplier | `Current_Supplier__c` | Text |  | length 100 |
| Customer Type | `Customer_Type__c` | Picklist |  | Direct Customer, Importer, Brand, Private Label, Distributor/Other |
| Expected Annual Volume | `Expected_Annual_Volume__c` | Number |  | 16,2 |
| Interested Product | `Interested_Product__c` | Lookup |  | ► Product2 (child relationship Interested_Leads__r) |
| Lead Score | `Lead_Score__c` | Number |  | 3,0 |
| Next Action | `Next_Action__c` | Text |  | length 255 |
| Next Follow-up Date | `Next_Follow_up_Date__c` | Date |  |  |
| Potential Rating | `Potential_Rating__c` | Picklist |  | Low, Medium, High |
| Purchase Timeline | `Purchase_Timeline__c` | Picklist |  | <3 Months, 3-6 Months, 6-12 Months, >12 Months |
| Qualification Notes | `Qualification_Notes__c` | LongTextArea |  | length 32768 |
| Sample Request Date | `Sample_Request_Date__c` | Date |  |  |
| Sample Requested | `Sample_Requested__c` | Checkbox |  |  — default false |
| Volume Unit | `Volume_Unit__c` | Picklist |  | MT, KG, Other |

## Validation rules

| Object | Rule | Condition | Message |
|---|---|---|---|
| Opportunity | `VR_Closed_Lost_Needs_Reason` | `ISPICKVAL(StageName, "Closed Lost") && ISBLANK(TEXT(Loss_Reason__c))` | Select a Loss Reason before closing the opportunity as lost, so the relationship can be re-engaged later. |
| Opportunity | `VR_Later_Stages_Need_Approved_Sample` | `ISPICKVAL(Opportunity_Type__c, "New Business") && ISBLANK(Sample_Approved_Date__c) && CASE(TEXT(StageName), "Sample Approved", 1, "Technical Evaluation", 1, "Pricing Discussion", 1, "Quotation Sent", 1, "Negotiation", 1, "Customer Approval", 1, "PO Received", 1, "Closed Won", 1, 0) = 1` | A new-business opportunity needs an approved Sample Request before it can move past Sample Testing. Approve the sample first (the Sample Approved Date is set automatically). |
| Opportunity | `VR_PO_Received_Needs_PO` | `CASE(TEXT(StageName), "PO Received", 1, "Closed Won", 1, 0) = 1 && (ISBLANK(PO_Number__c) || ISBLANK(PO_Date__c))` | PO Number and PO Date are required for PO Received and Closed Won. |
| Opportunity | `VR_Quotation_Stages_Need_Quote` | `CASE(TEXT(StageName), "Quotation Sent", 1, "Negotiation", 1, "Customer Approval", 1, 0) = 1 && Quote_Count__c = 0` | Create a Quote for this opportunity before moving to Quotation Sent, Negotiation or Customer Approval. |
| Opportunity | `VR_Sample_Requested_Needs_Sample` | `NOT(ISNEW()) && ISCHANGED(StageName) && ISPICKVAL(StageName, "Sample Requested") && Sample_Request_Count__c = 0` | Create a Sample Request for this opportunity before setting the stage to Sample Requested. |
| Opportunity | `VR_Technical_Evaluation_Needs_Status` | `ISPICKVAL(StageName, "Technical Evaluation") && ISBLANK(TEXT(Technical_Evaluation_Status__c))` | Set the Technical Evaluation Status when the opportunity is in Technical Evaluation. |
| Quote | `VR_Sent_Requires_Approval` | `CASE(TEXT(Status), "Sent", 1, "Presented", 1, "Accepted", 1, 0) = 1 && Requires_Approval__c && NOT(ISPICKVAL(Approval_Status__c, "Approved"))` | This quote exceeds the discount threshold and must be approved before it is sent or accepted. Use Submit for Approval. |
| Sample_Request__c | `VR_Approved_Requires_Feedback` | `ISPICKVAL(Result__c, "Approved") && ISBLANK(Customer_Feedback__c)` | Record the customer feedback before approving a sample. |
| Sample_Request__c | `VR_Closed_Requires_Reason` | `ISPICKVAL(Status__c, "Closed") && ISBLANK(Closure_Reason__c)` | Enter a closure reason when closing a sample request without a result. |
| Sample_Request__c | `VR_Dispatch_Date_After_Request` | `NOT(ISBLANK(Dispatch_Date__c)) && NOT(ISBLANK(Requested_Date__c)) && Dispatch_Date__c < Requested_Date__c` | Dispatch date cannot be earlier than the requested date. |
| Sample_Request__c | `VR_Dispatch_Requires_Courier_Tracking` | `ISPICKVAL(Status__c, "Dispatched") && (ISBLANK(Courier_Partner__c) || ISBLANK(Tracking_Number__c))` | Courier partner and tracking number are required before a sample can be marked Dispatched. |
| Sample_Request__c | `VR_Dispatch_Requires_Date` | `ISPICKVAL(Status__c, "Dispatched") && ISBLANK(Dispatch_Date__c)` | Dispatch date is required when the status is Dispatched. |
| Sample_Request__c | `VR_Feedback_Requires_Result` | `ISPICKVAL(Status__c, "Feedback Received") && (ISBLANK(TEXT(Result__c)) || ISPICKVAL(Result__c, "Pending"))` | Select the sample result (Approved or Rejected) when feedback is received. |
| Sample_Request__c | `VR_Feedback_Requires_Text` | `ISPICKVAL(Status__c, "Feedback Received") && ISBLANK(Customer_Feedback__c)` | Record the customer feedback before setting the status to Feedback Received. |
| Sample_Request__c | `VR_Quantity_Positive` | `Sample_Quantity__c <= 0` | Sample quantity must be greater than zero. |
| Sample_Request__c | `VR_Rejected_Requires_Next_Action` | `ISPICKVAL(Result__c, "Rejected") && ISBLANK(Next_Action__c)` | Enter the next action (for example: send revised sample with adjusted specification) when a sample is rejected. |
| Sample_Request__c | `VR_Rejected_Requires_Reason` | `ISPICKVAL(Result__c, "Rejected") && ISBLANK(TEXT(Rejection_Reason__c))` | A rejection reason is required when a sample is rejected. The opportunity stays open for the next iteration. |

## Opportunity stages (StandardValueSet OpportunityStage)

| Stage | Probability | Forecast | Closed/Won | Exit evidence enforced |
|---|---|---|---|---|
| Sample Requested | 10% | Pipeline | false/false | At least one Sample Request (on stage change) |
| Sample Testing | 20% | Pipeline | false/false | Set automatically when a sample is dispatched |
| Sample Approved | 30% | Pipeline | false/false | Sample Approved Date (set by the sample approval flow) |
| Technical Evaluation | 40% | Pipeline | false/false | Technical Evaluation Status |
| Pricing Discussion | 50% | Pipeline | false/false | Approved sample (new business) |
| Quotation Sent | 60% | BestCase | false/false | At least one Quote |
| Negotiation | 70% | BestCase | false/false | At least one Quote |
| Customer Approval | 80% | Forecast | false/false | At least one Quote; onboarding checklist created |
| PO Received | 90% | Forecast | false/false | PO Number + PO Date; Order created |
| Closed Won | 100% | Closed | true/true | PO Number + PO Date; set automatically when the Order is activated |
| Closed Lost | 0% | Omitted | true/false | Loss Reason; re-engagement task in 90 days |

Legacy standard stages (Prospecting, Qualification, ...) are deployed as inactive so existing records in the target org are not invalidated.

## Sample Request status model

```
Requested → (Approval Pending, when quantity > DEMO limit) → Prepared → Dispatched → Customer Testing → Feedback Received → Approved | Rejected
                                                                                                                      └─ New Sample Iteration (n+1) → same Opportunity
Closed: administrative closure with a reason
```

