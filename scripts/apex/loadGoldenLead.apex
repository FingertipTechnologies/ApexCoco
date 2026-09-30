/**
 * Apex Coco - Person 2: golden demo LEAD (shared hand-off record with Person 1 - Visiting Card -> Lead).
 *
 * Creates the qualified Lead "ABC Foods International / Michael Anderson" exactly as Person 1 hands it over
 * (Lead Status = Qualified-equivalent, Sample Requested = TRUE, Next Action = Create Sample Request).
 * Run after loadDemoData_1..4 scripts. The "Request Sample" action on this lead converts it and attaches it to the
 * pre-loaded ABC Foods International account (duplicate prevention by company name).
 *
 *   sf apex run --file scripts/apex/loadGoldenLead.apex --target-org <alias>
 */
Set<String> statuses = new Set<String>();
for (LeadStatus ls : [SELECT MasterLabel FROM LeadStatus WHERE IsConverted = false]) { statuses.add(ls.MasterLabel); }
String status = statuses.contains('Qualified') ? 'Qualified' : new List<String>(statuses)[0];

Lead golden = new Lead(
    FirstName = 'Michael', LastName = 'Anderson', Title = 'VP Procurement', Designation__c = 'VP Procurement', Company = 'ABC Foods International',
    Email = 'michael.anderson@abcfoods-intl.example', Phone = '+1 973 555 0142', WhatsApp_Number__c = '+1 973 555 0142', Country = 'United States', Country__c = 'United States', State = 'New Jersey', City = 'Newark',
    LeadSource = 'Trade Show', Event_Name__c = 'International Food Expo', Status = status, Rating = 'Hot', Industry = 'Food & Beverage', Website = 'www.abcfoods-intl.example', LinkedIn_Profile__c = 'https://www.linkedin.com/company/abcfoods-intl',
    Company_Type__c = 'Importer', Customer_Type__c = 'Importer', Business_Model__c = 'Bulk Ingredient Buyer', Employee_Count__c = 120,
    Potential_Category__c = 'High', Buying_Intent__c = 'R&D Evaluation', Purchase_Timeline__c = '6 Months', Estimated_Annual_Volume__c = 500, Expected_Monthly_Volume__c = 40,
    Interested_Product__c = 'Coconut Milk Powder', Application_Usage__c = 'Bakery and beverage manufacturers in the US Northeast (reconstitution trials).',
    Lead_Classification__c = 'Potential Customer', Research_Completed__c = true, Research_Notes__c = 'Importer supplying US bakery and beverage manufacturers. Currently buying from Competitor A at about 3,400/MT. APEX DEMO DATA',
    Current_Supplier__c = 'Competitor A', Competitor__c = 'Competitor A', Reason_for_Switching__c = 'Lead Time',
    Last_Contact_Date__c = Date.today().addDays(-1), Next_Followup_Date__c = Date.today().addDays(2), Preferred_Communication__c = 'WhatsApp', Customer_Response__c = 'Requested Sample',
    Sample_Requested__c = true, Sample_Request_Date__c = Date.today(), Sample_Product__c = 'Coconut Milk Powder',
    Decision_Maker_Identified__c = true, Product_Requirement_Confirmed__c = true,
    AI_Lead_Score__c = 92, Lead_Health__c = 'High', AI_Insights__c = 'High-fit importer: target geography, product fit, 500 MT volume, R&D has requested samples. Recommended next action: create Sample Request.',
    Description = 'APEX DEMO DATA'
);
insert golden;
System.debug('Golden lead created: ' + golden.Id + ' (status ' + status + '). Open it and click "Request Sample".');
