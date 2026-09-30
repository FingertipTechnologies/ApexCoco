/**
 * Apex Coco - Person 2 DEMO DATA, part 2 of 4: opportunities, sample requests (with rejected -> approved iteration), stage progression
 * Anonymous Apex is limited to 32,000 characters, so the load runs as four scripts in order:
 *   sf apex run --file scripts/apex/loadDemoData_1_Master.apex
 *   sf apex run --file scripts/apex/loadDemoData_2_Pipeline.apex
 *   sf apex run --file scripts/apex/loadDemoData_3_Commercial.apex
 *   sf apex run --file scripts/apex/loadDemoData_4_Context.apex
 * All records are labelled APEX DEMO DATA; scripts/apex/resetDemoData.apex removes them.
 */
final String MARK = 'APEX DEMO DATA';
Date today = Date.today();
User me = [SELECT Id, Name FROM User WHERE Id = :UserInfo.getUserId()];
Set<String> demoCompanies = new Set<String>{ 'ABC Foods International', 'Global Ingredients UK', 'Nature Brands India', 'Pacific Bakers Inc', 'Euro Dairy Alternatives GmbH', 'Gulf Trading LLC', 'Aussie Health Foods Pty', 'Nordic Foods AB', 'Mumbai Sweets Pvt Ltd', 'Sunrise Beverages Ltd' };
Set<String> demoProducts = new Set<String>{ 'Coconut Milk Powder', 'Coconut Cream Powder', 'Coconut Cream', 'Desiccated Coconut - Fine', 'Desiccated Coconut - Medium', 'Low-Fat Desiccated Coconut', 'Virgin Coconut Oil', 'Coconut Flour', 'Coconut Milk Powder - Private Label' };
Pricebook2 standardPb = [SELECT Id FROM Pricebook2 WHERE IsStandard = true LIMIT 1];
Map<String, Product2> products = new Map<String, Product2>();
for (Product2 p : [SELECT Id, Name FROM Product2 WHERE Name IN :demoProducts]) { products.put(p.Name, p); }
Map<Id, PricebookEntry> pbeByProduct = new Map<Id, PricebookEntry>();
for (PricebookEntry pbe : [SELECT Id, Product2Id, UnitPrice FROM PricebookEntry WHERE Pricebook2Id = :standardPb.Id AND Product2Id IN :products.values()]) { pbeByProduct.put(pbe.Product2Id, pbe); }
Product2 cmp = products.get('Coconut Milk Powder');
Product2 ccp = products.get('Coconut Cream Powder');
Product2 cream = products.get('Coconut Cream');
Product2 dcFine = products.get('Desiccated Coconut - Fine');
Product2 dcMed = products.get('Desiccated Coconut - Medium');
Product2 lfdc = products.get('Low-Fat Desiccated Coconut');
Product2 vco = products.get('Virgin Coconut Oil');
Product2 flour = products.get('Coconut Flour');
Product2 cmpPl = products.get('Coconut Milk Powder - Private Label');
Map<String, Account> acc = new Map<String, Account>();
for (Account a : [SELECT Id, Name FROM Account WHERE Name IN :demoCompanies]) { acc.put(a.Name, a); }
Map<String, Contact> con = new Map<String, Contact>();
for (Contact c : [SELECT Id, Email FROM Contact WHERE AccountId IN :acc.values()]) { con.put(c.Email, c); }
Contact michael = con.get('michael.anderson@abcfoods-intl.example');
Contact laura = con.get('laura.chen@abcfoods-intl.example');
// ---- Opportunities across the Apex stages (sample rules respected)
// Helper closures are not available in anonymous Apex; build records explicitly.
List<Opportunity> opps = new List<Opportunity>{
    // Sample Requested (stale: no activity, created long ago is simulated by the stale flow after the period)
    new Opportunity(Name = 'Sunrise Beverages Ltd - Coconut Cream', AccountId = acc.get('Sunrise Beverages Ltd').Id, StageName = 'Sample Requested', CloseDate = today.addDays(120), Primary_Product__c = cream.Id, Expected_Annual_Volume__c = 120, Volume_Unit__c = 'MT', Purchase_Timeline__c = '12 Months', Opportunity_Type__c = 'New Business', Next_Action__c = 'Prepare and dispatch sample #1', Description = MARK),
    // Sample Testing
    new Opportunity(Name = 'Pacific Bakers Inc - Coconut Flour', AccountId = acc.get('Pacific Bakers Inc').Id, StageName = 'Sample Requested', CloseDate = today.addDays(90), Primary_Product__c = flour.Id, Expected_Annual_Volume__c = 60, Volume_Unit__c = 'MT', Purchase_Timeline__c = '6 Months', Opportunity_Type__c = 'New Business', Current_Supplier__c = 'Competitor B', Competitor__c = 'Competitor B', Description = MARK),
    // Technical Evaluation (sample 1 rejected, sample 2 approved)
    new Opportunity(Name = 'Gulf Trading LLC - Desiccated Coconut - Medium', AccountId = acc.get('Gulf Trading LLC').Id, StageName = 'Sample Requested', CloseDate = today.addDays(75), Primary_Product__c = dcMed.Id, Expected_Annual_Volume__c = 240, Volume_Unit__c = 'MT', Purchase_Timeline__c = '6 Months', Opportunity_Type__c = 'New Business', Current_Supplier__c = 'Competitor C', Competitor__c = 'Competitor C', Description = MARK),
    // Quotation Sent (quote v1 revised to v2)
    new Opportunity(Name = 'Nature Brands India - Desiccated Coconut - Fine', AccountId = acc.get('Nature Brands India').Id, StageName = 'Sample Requested', CloseDate = today.addDays(45), Primary_Product__c = dcFine.Id, Expected_Annual_Volume__c = 180, Volume_Unit__c = 'MT', Purchase_Timeline__c = '3 Months', Opportunity_Type__c = 'New Business', Current_Supplier__c = 'Competitor C', Competitor__c = 'Competitor C', Amount = 432000, Description = MARK),
    // Negotiation (discount above threshold, pending approval)
    new Opportunity(Name = 'Euro Dairy Alternatives GmbH - Coconut Milk Powder - Private Label', AccountId = acc.get('Euro Dairy Alternatives GmbH').Id, StageName = 'Sample Requested', CloseDate = today.addDays(30), Primary_Product__c = cmpPl.Id, Expected_Annual_Volume__c = 300, Volume_Unit__c = 'MT', Purchase_Timeline__c = '3 Months', Opportunity_Type__c = 'New Business', Current_Supplier__c = 'Competitor A', Competitor__c = 'Competitor A', Amount = 1095000, Description = MARK),
    // Customer Approval (onboarding in progress)
    new Opportunity(Name = 'Aussie Health Foods Pty - Virgin Coconut Oil', AccountId = acc.get('Aussie Health Foods Pty').Id, StageName = 'Sample Requested', CloseDate = today.addDays(20), Primary_Product__c = vco.Id, Expected_Annual_Volume__c = 48, Volume_Unit__c = 'MT', Purchase_Timeline__c = '3 Months', Opportunity_Type__c = 'New Business', Amount = 249600, Description = MARK),
    // Closed Lost with reason (re-engagement path)
    new Opportunity(Name = 'Nordic Foods AB - Low-Fat Desiccated Coconut', AccountId = acc.get('Nordic Foods AB').Id, StageName = 'Sample Requested', CloseDate = today.addDays(-20), Primary_Product__c = lfdc.Id, Expected_Annual_Volume__c = 100, Volume_Unit__c = 'MT', Purchase_Timeline__c = '6 Months', Opportunity_Type__c = 'New Business', Current_Supplier__c = 'Competitor B', Competitor__c = 'Competitor B', Amount = 260000, Description = MARK),
    // Closed Won - Global Ingredients UK (repeat customer, 90-day cadence)
    new Opportunity(Name = 'Global Ingredients UK - Coconut Milk Powder', AccountId = acc.get('Global Ingredients UK').Id, StageName = 'Sample Requested', CloseDate = today.addDays(-260), Primary_Product__c = cmp.Id, Expected_Annual_Volume__c = 400, Volume_Unit__c = 'MT', Purchase_Timeline__c = '3 Months', Opportunity_Type__c = 'New Business', Current_Supplier__c = 'Competitor A', Competitor__c = 'Competitor A', Amount = 340000, Description = MARK),
    // Closed Won - Mumbai Sweets (domestic, 30-day cadence, now overdue)
    new Opportunity(Name = 'Mumbai Sweets Pvt Ltd - Desiccated Coconut - Fine', AccountId = acc.get('Mumbai Sweets Pvt Ltd').Id, StageName = 'Sample Requested', CloseDate = today.addDays(-200), Primary_Product__c = dcFine.Id, Expected_Annual_Volume__c = 240, Volume_Unit__c = 'MT', Purchase_Timeline__c = '3 Months', Opportunity_Type__c = 'New Business', Amount = 48000, Description = MARK)
};
insert opps;
Map<String, Opportunity> opp = new Map<String, Opportunity>();
for (Opportunity o : opps) { opp.put(o.Name, o); }
// ---- Sample requests (statuses drive the opportunity automation)
List<Sample_Request__c> samples = new List<Sample_Request__c>{
    new Sample_Request__c(Account__c = acc.get('Sunrise Beverages Ltd').Id, Contact__c = con.get('hannah.price@sunrisebev.example').Id, Opportunity__c = opp.get('Sunrise Beverages Ltd - Coconut Cream').Id, Product__c = cream.Id, Specification__c = 'Coconut cream 24% fat, aseptic', Sample_Quantity__c = 2, Sample_Unit__c = 'KG', Requested_Date__c = today.addDays(-40), Status__c = 'Requested', Iteration_Number__c = 1, Notes__c = MARK),
    new Sample_Request__c(Account__c = acc.get('Pacific Bakers Inc').Id, Contact__c = con.get('daniel.ortiz@pacificbakers.example').Id, Opportunity__c = opp.get('Pacific Bakers Inc - Coconut Flour').Id, Product__c = flour.Id, Specification__c = 'Fine grind, gluten-free', Sample_Quantity__c = 5, Sample_Unit__c = 'KG', Requested_Date__c = today.addDays(-12), Prepared_Date__c = today.addDays(-10), Batch_Number__c = 'CF-2609-007', Dispatch_Date__c = today.addDays(-9), Courier_Partner__c = 'DHL', Tracking_Number__c = 'DHL7781234509', Status__c = 'Customer Testing', Iteration_Number__c = 1, Notes__c = MARK),
    new Sample_Request__c(Account__c = acc.get('Gulf Trading LLC').Id, Contact__c = con.get('omar.haddad@gulftrading.example').Id, Opportunity__c = opp.get('Gulf Trading LLC - Desiccated Coconut - Medium').Id, Product__c = dcMed.Id, Specification__c = 'Medium grade, moisture < 3%', Sample_Quantity__c = 5, Sample_Unit__c = 'KG', Requested_Date__c = today.addDays(-60), Prepared_Date__c = today.addDays(-58), Batch_Number__c = 'DCM-2608-014', Dispatch_Date__c = today.addDays(-57), Courier_Partner__c = 'FedEx', Tracking_Number__c = 'FX441120983', Status__c = 'Rejected', Result__c = 'Rejected', Customer_Feedback__c = 'Moisture measured at 3.4%, above the 3% limit. Colour acceptable.', Rejection_Reason__c = 'Moisture', Next_Action__c = 'Send revised sample dried to < 2.5% moisture', Next_Action_Date__c = today.addDays(-50), Feedback_Received_Date__c = today.addDays(-45), Iteration_Number__c = 1, Notes__c = MARK),
    new Sample_Request__c(Account__c = acc.get('Nature Brands India').Id, Contact__c = con.get('priya.nair@naturebrands.example').Id, Opportunity__c = opp.get('Nature Brands India - Desiccated Coconut - Fine').Id, Product__c = dcFine.Id, Specification__c = 'Fine grade, retail pack quality', Sample_Quantity__c = 3, Sample_Unit__c = 'KG', Requested_Date__c = today.addDays(-70), Prepared_Date__c = today.addDays(-68), Batch_Number__c = 'DCF-2608-021', Dispatch_Date__c = today.addDays(-67), Courier_Partner__c = 'Blue Dart', Tracking_Number__c = 'BD55012377', Status__c = 'Approved', Result__c = 'Approved', Customer_Feedback__c = 'Meets spec. Taste panel approved.', Approval_Date__c = today.addDays(-55), Feedback_Received_Date__c = today.addDays(-55), Iteration_Number__c = 1, Notes__c = MARK),
    new Sample_Request__c(Account__c = acc.get('Euro Dairy Alternatives GmbH').Id, Contact__c = con.get('katrin.weber@eurodairy.example').Id, Opportunity__c = opp.get('Euro Dairy Alternatives GmbH - Coconut Milk Powder - Private Label').Id, Product__c = cmpPl.Id, Specification__c = 'Private label spec EDA-PL-3, 55% fat', Sample_Quantity__c = 10, Sample_Unit__c = 'KG', Requested_Date__c = today.addDays(-90), Prepared_Date__c = today.addDays(-87), Batch_Number__c = 'CMP-2607-003', Dispatch_Date__c = today.addDays(-86), Courier_Partner__c = 'DHL', Tracking_Number__c = 'DHL7780091144', Status__c = 'Approved', Result__c = 'Approved', Customer_Feedback__c = 'Reconstitution and mouthfeel approved by R&D.', Approval_Date__c = today.addDays(-70), Feedback_Received_Date__c = today.addDays(-70), Iteration_Number__c = 1, Notes__c = MARK),
    new Sample_Request__c(Account__c = acc.get('Aussie Health Foods Pty').Id, Contact__c = con.get('chloe.bennett@aussiehealth.example').Id, Opportunity__c = opp.get('Aussie Health Foods Pty - Virgin Coconut Oil').Id, Product__c = vco.Id, Specification__c = 'Cold pressed, FFA < 0.2%', Sample_Quantity__c = 1, Sample_Unit__c = 'KG', Requested_Date__c = today.addDays(-100), Prepared_Date__c = today.addDays(-98), Batch_Number__c = 'VCO-2606-011', Dispatch_Date__c = today.addDays(-97), Courier_Partner__c = 'DHL', Tracking_Number__c = 'DHL7779955120', Status__c = 'Approved', Result__c = 'Approved', Customer_Feedback__c = 'Approved. Aroma and FFA within spec.', Approval_Date__c = today.addDays(-85), Feedback_Received_Date__c = today.addDays(-85), Iteration_Number__c = 1, Notes__c = MARK),
    new Sample_Request__c(Account__c = acc.get('Nordic Foods AB').Id, Contact__c = con.get('erik.lindqvist@nordicfoods.example').Id, Opportunity__c = opp.get('Nordic Foods AB - Low-Fat Desiccated Coconut').Id, Product__c = lfdc.Id, Specification__c = 'Low fat < 45%', Sample_Quantity__c = 5, Sample_Unit__c = 'KG', Requested_Date__c = today.addDays(-120), Prepared_Date__c = today.addDays(-118), Batch_Number__c = 'LFDC-2606-002', Dispatch_Date__c = today.addDays(-117), Courier_Partner__c = 'UPS', Tracking_Number__c = '1Z999AA10123456784', Status__c = 'Approved', Result__c = 'Approved', Customer_Feedback__c = 'Approved technically; commercial terms not agreed.', Approval_Date__c = today.addDays(-100), Feedback_Received_Date__c = today.addDays(-100), Iteration_Number__c = 1, Notes__c = MARK),
    new Sample_Request__c(Account__c = acc.get('Global Ingredients UK').Id, Contact__c = con.get('james.whitfield@globalingredients.example').Id, Opportunity__c = opp.get('Global Ingredients UK - Coconut Milk Powder').Id, Product__c = cmp.Id, Specification__c = 'Spray dried, 60% fat', Sample_Quantity__c = 5, Sample_Unit__c = 'KG', Requested_Date__c = today.addDays(-320), Prepared_Date__c = today.addDays(-318), Batch_Number__c = 'CMP-2510-004', Dispatch_Date__c = today.addDays(-317), Courier_Partner__c = 'DHL', Tracking_Number__c = 'DHL7770012345', Status__c = 'Approved', Result__c = 'Approved', Customer_Feedback__c = 'Approved.', Approval_Date__c = today.addDays(-300), Feedback_Received_Date__c = today.addDays(-300), Iteration_Number__c = 1, Notes__c = MARK),
    new Sample_Request__c(Account__c = acc.get('Mumbai Sweets Pvt Ltd').Id, Contact__c = con.get('rohan.desai@mumbaisweets.example').Id, Opportunity__c = opp.get('Mumbai Sweets Pvt Ltd - Desiccated Coconut - Fine').Id, Product__c = dcFine.Id, Specification__c = 'Fine grade', Sample_Quantity__c = 2, Sample_Unit__c = 'KG', Requested_Date__c = today.addDays(-240), Prepared_Date__c = today.addDays(-239), Batch_Number__c = 'DCF-2602-009', Dispatch_Date__c = today.addDays(-238), Courier_Partner__c = 'Blue Dart', Tracking_Number__c = 'BD55000123', Status__c = 'Approved', Result__c = 'Approved', Customer_Feedback__c = 'Approved.', Approval_Date__c = today.addDays(-230), Feedback_Received_Date__c = today.addDays(-230), Iteration_Number__c = 1, Notes__c = MARK)
};
// Insert every sample as Requested/Pending first, then update to its final status so the After-Update flow runs
// (it sets Opportunity.Sample Approved Date, advances the stage, creates tasks and notifications exactly as in the demo).
Map<Integer, String[]> finalState = new Map<Integer, String[]>();
for (Integer i = 0; i < samples.size(); i++) {
    finalState.put(i, new String[]{ samples[i].Status__c, samples[i].Result__c });
    samples[i].Status__c = 'Requested';
    samples[i].Result__c = 'Pending';
}
insert samples;
for (Integer i = 0; i < samples.size(); i++) {
    samples[i].Status__c = finalState.get(i)[0];
    samples[i].Result__c = finalState.get(i)[1] == null ? 'Pending' : finalState.get(i)[1];
}
update samples;
// Gulf Trading iteration 2 (approved) linked to the rejected iteration 1
Sample_Request__c gulf1 = samples[2];
Sample_Request__c gulf2 = new Sample_Request__c(Parent_Sample_Request__c = gulf1.Id, Account__c = gulf1.Account__c, Contact__c = gulf1.Contact__c, Opportunity__c = gulf1.Opportunity__c, Product__c = dcMed.Id,
    Specification__c = 'Medium grade, moisture < 2.5% (revised)', Sample_Quantity__c = 5, Sample_Unit__c = 'KG', Requested_Date__c = today.addDays(-48), Prepared_Date__c = today.addDays(-45), Batch_Number__c = 'DCM-2608-019',
    Dispatch_Date__c = today.addDays(-44), Courier_Partner__c = 'FedEx', Tracking_Number__c = 'FX441120999', Status__c = 'Approved', Result__c = 'Approved',
    Customer_Feedback__c = 'Moisture 2.1%. Approved for commercial discussion.', Approval_Date__c = today.addDays(-30), Feedback_Received_Date__c = today.addDays(-30), Iteration_Number__c = 2, Notes__c = MARK);
gulf2.Status__c = 'Requested'; gulf2.Result__c = 'Pending';
insert gulf2;
gulf2.Status__c = 'Approved'; gulf2.Result__c = 'Approved';
update gulf2;
// ---- Advance opportunities to their demo stages (validation rules need the approved-sample dates set by the flows)
Map<Id, Opportunity> refreshed = new Map<Id, Opportunity>([SELECT Id, Name, StageName, Sample_Approved_Date__c FROM Opportunity WHERE Id IN :opps]);
List<Opportunity> stageUpdates = new List<Opportunity>();
Opportunity o;
o = refreshed.get(opp.get('Pacific Bakers Inc - Coconut Flour').Id); o.StageName = 'Sample Testing'; o.Next_Action__c = 'Chase Daniel for test results'; stageUpdates.add(o);
o = refreshed.get(opp.get('Gulf Trading LLC - Desiccated Coconut - Medium').Id); o.StageName = 'Technical Evaluation'; o.Technical_Evaluation_Status__c = 'In Progress'; o.Next_Action__c = 'Share COA and spec sheet for revised moisture'; stageUpdates.add(o);
o = refreshed.get(opp.get('Nature Brands India - Desiccated Coconut - Fine').Id); o.StageName = 'Pricing Discussion'; o.Technical_Evaluation_Status__c = 'Complete'; stageUpdates.add(o);
o = refreshed.get(opp.get('Euro Dairy Alternatives GmbH - Coconut Milk Powder - Private Label').Id); o.StageName = 'Pricing Discussion'; o.Technical_Evaluation_Status__c = 'Complete'; stageUpdates.add(o);
o = refreshed.get(opp.get('Aussie Health Foods Pty - Virgin Coconut Oil').Id); o.StageName = 'Pricing Discussion'; o.Technical_Evaluation_Status__c = 'Complete'; stageUpdates.add(o);
o = refreshed.get(opp.get('Nordic Foods AB - Low-Fat Desiccated Coconut').Id); o.StageName = 'Pricing Discussion'; o.Technical_Evaluation_Status__c = 'Complete'; stageUpdates.add(o);
o = refreshed.get(opp.get('Global Ingredients UK - Coconut Milk Powder').Id); o.StageName = 'Pricing Discussion'; o.Technical_Evaluation_Status__c = 'Complete'; stageUpdates.add(o);
o = refreshed.get(opp.get('Mumbai Sweets Pvt Ltd - Desiccated Coconut - Fine').Id); o.StageName = 'Pricing Discussion'; o.Technical_Evaluation_Status__c = 'Complete'; stageUpdates.add(o);
update stageUpdates;
System.debug('Part 2 done: opportunities=' + opps.size() + ' samples=' + (samples.size() + 1));
