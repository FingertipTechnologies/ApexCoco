/**
 * Apex Coco - Person 2 DEMO DATA, part 4 of 4: competitor intel, onboarding, complaint cases, activities, permission sets
 * Anonymous Apex is limited to 32,000 characters, so the load runs as four scripts in order:
 *   sf apex run --file scripts/apex/loadDemoData_1_Master.apex
 *   sf apex run --file scripts/apex/loadDemoData_2_Pipeline.apex
 *   sf apex run --file scripts/apex/loadDemoData_3_Commercial.apex
 *   sf apex run --file scripts/apex/loadDemoData_4_Context.apex
 * All records are labelled APEX DEMO DATA; scripts/apex/resetDemoData.apex removes them.
 * Run scripts/apex/loadGoldenLead.apex afterwards for the merged Person 1 + Person 2 demo start.
 */
final String MARK = 'APEX DEMO DATA';
Date today = Date.today();
User me = [SELECT Id, Name FROM User WHERE Id = :UserInfo.getUserId()];
Pricebook2 standardPb = [SELECT Id FROM Pricebook2 WHERE IsStandard = true LIMIT 1];
Map<String, Product2> products = new Map<String, Product2>();
for (Product2 p : [SELECT Id, Name FROM Product2 WHERE Description = :MARK]) { products.put(p.Name, p); }
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
for (Account a : [SELECT Id, Name FROM Account WHERE Description = :MARK]) { acc.put(a.Name, a); }
Map<String, Contact> con = new Map<String, Contact>();
for (Contact c : [SELECT Id, Email FROM Contact WHERE AccountId IN :acc.values()]) { con.put(c.Email, c); }
Contact michael = con.get('michael.anderson@abcfoods-intl.example');
Contact laura = con.get('laura.chen@abcfoods-intl.example');
Map<String, Opportunity> opp = new Map<String, Opportunity>();
for (Opportunity o0 : [SELECT Id, Name FROM Opportunity WHERE AccountId IN :acc.values() AND Description = :MARK]) { opp.put(o0.Name, o0); }
List<Opportunity> opps = opp.values();
// ---- Competitor intel
insert new List<Competitor_Intel__c>{
    new Competitor_Intel__c(Competitor_Name__c = 'Competitor A', Account__c = acc.get('ABC Foods International').Id, Product__c = cmp.Id, Quoted_Price__c = 3400, Price_Unit__c = 'per MT', Customer_Preference__c = 'Lower price', Strength__c = 'Price', Weakness__c = 'Lead time (8-10 weeks) and inconsistent particle size', Source__c = 'Customer Discussion', Intel_Date__c = today.addDays(-3), Notes__c = MARK),
    new Competitor_Intel__c(Competitor_Name__c = 'Competitor A', Account__c = acc.get('Euro Dairy Alternatives GmbH').Id, Opportunity__c = opp.get('Euro Dairy Alternatives GmbH - Coconut Milk Powder - Private Label').Id, Product__c = cmpPl.Id, Quoted_Price__c = 3400, Price_Unit__c = 'per MT', Customer_Preference__c = 'Lower price, shorter supply commitment', Strength__c = 'Price', Weakness__c = 'No private-label packaging service', Source__c = 'Customer Discussion', Intel_Date__c = today.addDays(-6), Notes__c = MARK),
    new Competitor_Intel__c(Competitor_Name__c = 'Competitor B', Account__c = acc.get('Nordic Foods AB').Id, Opportunity__c = opp.get('Nordic Foods AB - Low-Fat Desiccated Coconut').Id, Product__c = lfdc.Id, Quoted_Price__c = 2450, Price_Unit__c = 'per MT', Customer_Preference__c = 'Price', Strength__c = 'Freight advantage to Scandinavia', Weakness__c = 'Quality complaints on moisture', Source__c = 'Customer Discussion', Intel_Date__c = today.addDays(-25), Notes__c = MARK),
    new Competitor_Intel__c(Competitor_Name__c = 'Competitor C', Account__c = acc.get('Nature Brands India').Id, Opportunity__c = opp.get('Nature Brands India - Desiccated Coconut - Fine').Id, Product__c = dcFine.Id, Quoted_Price__c = 2300, Price_Unit__c = 'per MT', Customer_Preference__c = 'Consistent grade and delivery reliability', Strength__c = 'Domestic freight', Weakness__c = 'No BRC certification', Source__c = 'Trade Show', Intel_Date__c = today.addDays(-15), Notes__c = MARK)
};
// ---- Onboarding (Customer Approval automation created one for Aussie Health); complete Global Ingredients
List<Customer_Onboarding__c> onb = [SELECT Id, Status__c FROM Customer_Onboarding__c WHERE Opportunity__c = :opp.get('Aussie Health Foods Pty - Virgin Coconut Oil').Id];
for (Customer_Onboarding__c ob : onb) { ob.Company_Information_Status__c = 'Complete'; ob.Quality_Status__c = 'In Progress'; ob.Finance_Status__c = 'Complete'; }
update onb;
insert new Customer_Onboarding__c(Account__c = acc.get('Global Ingredients UK').Id, Opportunity__c = opp.get('Global Ingredients UK - Coconut Milk Powder').Id, Due_Date__c = today.addDays(-270), Company_Information_Status__c = 'Complete', Finance_Status__c = 'Complete', Quality_Status__c = 'Complete', Logistics_Status__c = 'Complete', Compliance_Status__c = 'Complete', Notes__c = MARK);
// ---- Complaints (Cases) routed to the Quality queue by flow
List<Order> giOrders = [SELECT Id, OrderNumber FROM Order WHERE AccountId = :acc.get('Global Ingredients UK').Id ORDER BY EffectiveDate ASC];
Order giLast = giOrders[giOrders.size() - 1];
insert new List<Case>{
    new Case(Subject = 'Off-odour in 3 bags of lot CMP-2607-031', Description = 'Customer reports rancid odour in 3 x 25 kg bags from the July shipment. Photos attached by email. ' + MARK, AccountId = acc.get('Global Ingredients UK').Id, ContactId = con.get('james.whitfield@globalingredients.example').Id, Origin = 'Email', Status = 'New', Complaint_Type__c = 'Quality', Complaint_Product__c = cmp.Id, Batch_Number__c = 'CMP-2607-031', Order__c = giLast.Id),
    new Case(Subject = 'Torn outer packaging on pallet 4', Description = 'Two cartons damaged in transit. ' + MARK, AccountId = acc.get('Mumbai Sweets Pvt Ltd').Id, ContactId = con.get('rohan.desai@mumbaisweets.example').Id, Origin = 'Phone', Status = 'Working', Complaint_Type__c = 'Packaging', Complaint_Product__c = dcFine.Id, Batch_Number__c = 'DCF-2607-015', Resolution__c = 'Replacement cartons dispatched.'),
    new Case(Subject = 'COA missing for batch DCF-2606-008', Description = 'Customer needs the certificate of analysis for customs clearance. ' + MARK, AccountId = acc.get('Mumbai Sweets Pvt Ltd').Id, Origin = 'Email', Status = 'Closed', Complaint_Type__c = 'Documentation', Complaint_Product__c = dcFine.Id, Batch_Number__c = 'DCF-2606-008', Resolution__c = 'COA re-issued by Quality.')
};
// ---- Activities on the golden account (long-cycle nurture history)
insert new List<Task>{
    new Task(Subject = 'Met at International Food Expo - scanned card', Status = 'Completed', Priority = 'Normal', ActivityDate = today.addDays(-258), WhoId = michael.Id, WhatId = acc.get('ABC Foods International').Id, Description = 'Interested in Coconut Milk Powder, ~500 MT/yr, currently buying from Competitor A at about 3,400/MT. ' + MARK),
    new Task(Subject = 'Call - indicative price discussed (no opportunity yet)', Status = 'Completed', Priority = 'Normal', ActivityDate = today.addDays(-240), WhoId = michael.Id, WhatId = acc.get('ABC Foods International').Id, Description = 'Quotation request is not an opportunity until they ask for samples. ' + MARK),
    new Task(Subject = 'WhatsApp - Laura Chen (R&D) wants samples for reconstitution trials', Status = 'Completed', Priority = 'High', ActivityDate = today.addDays(-1), WhoId = laura.Id, WhatId = acc.get('ABC Foods International').Id, Description = 'Ready to create the Sample Request. ' + MARK),
    // Old completed activity on Sunrise so its opportunity shows as STALE (Last Activity 45 days ago > 30-day DEMO threshold)
    new Task(Subject = 'Intro call - sample requested', Status = 'Completed', Priority = 'Normal', ActivityDate = today.addDays(-45), WhoId = con.get('hannah.price@sunrisebev.example').Id, WhatId = opp.get('Sunrise Beverages Ltd - Coconut Cream').Id, Description = 'No follow-up since. ' + MARK),
    new Task(Subject = 'Sent tracking details to Daniel', Status = 'Completed', Priority = 'Normal', ActivityDate = today.addDays(-8), WhoId = con.get('daniel.ortiz@pacificbakers.example').Id, WhatId = opp.get('Pacific Bakers Inc - Coconut Flour').Id, Description = MARK)
};
// ---- Demo users (best effort: depends on available licences) and permission sets for the running user
List<PermissionSet> psets = [SELECT Id, Name FROM PermissionSet WHERE Name IN ('Apex_Sales_Executive', 'Apex_Sales_Manager', 'Apex_Sales_Admin', 'Apex_Management')];
Set<Id> assigned = new Set<Id>();
for (PermissionSetAssignment psa : [SELECT PermissionSetId FROM PermissionSetAssignment WHERE AssigneeId = :me.Id]) { assigned.add(psa.PermissionSetId); }
List<PermissionSetAssignment> newPsa = new List<PermissionSetAssignment>();
for (PermissionSet ps : psets) { if (!assigned.contains(ps.Id)) { newPsa.add(new PermissionSetAssignment(AssigneeId = me.Id, PermissionSetId = ps.Id)); } }
insert newPsa;

System.debug('APEX DEMO DATA LOADED (part 4 of 4) for ' + me.Name + ' | accounts=' + acc.size() + ' opportunities=' + opps.size());
