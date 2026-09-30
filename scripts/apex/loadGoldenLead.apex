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
Product2 cmp = [SELECT Id FROM Product2 WHERE Name = 'Coconut Milk Powder' LIMIT 1];
Set<String> statuses = new Set<String>();
for (LeadStatus ls : [SELECT MasterLabel FROM LeadStatus WHERE IsConverted = false]) { statuses.add(ls.MasterLabel); }
String status = statuses.contains('Qualified') ? 'Qualified' : (statuses.contains('Working - Contacted') ? 'Working - Contacted' : new List<String>(statuses)[0]);

Lead golden = new Lead(
    FirstName = 'Michael', LastName = 'Anderson', Title = 'VP Procurement', Company = 'ABC Foods International',
    Email = 'michael.anderson@abcfoods-intl.example', Phone = '+1 973 555 0142', Country = 'United States', State = 'New Jersey', City = 'Newark',
    LeadSource = 'Trade Show', Status = status, Industry = 'Food & Beverage', Website = 'www.abcfoods-intl.example',
    Customer_Type__c = 'Importer', Business_Type__c = 'Food / ingredient importer', Interested_Product__c = cmp.Id,
    Expected_Annual_Volume__c = 500, Volume_Unit__c = 'MT', Purchase_Timeline__c = '3-6 Months',
    Current_Supplier__c = 'Competitor A', Competitor__c = 'Competitor A', Potential_Rating__c = 'High', Lead_Score__c = 92,
    Sample_Requested__c = true, Sample_Request_Date__c = Date.today(), Next_Action__c = 'Create Sample Request', Next_Follow_up_Date__c = Date.today().addDays(2),
    Qualification_Notes__c = 'Met at International Food Expo. Importer supplying US bakery and beverage manufacturers. 500 MT/yr Coconut Milk Powder, currently Competitor A at ~3,400/MT. R&D (Dr. Laura Chen) has asked for samples for reconstitution trials. APEX DEMO DATA',
    Description = 'APEX DEMO DATA'
);
insert golden;
System.debug('Golden lead created: ' + golden.Id + ' (status ' + status + '). Open it and click "Request Sample".');
