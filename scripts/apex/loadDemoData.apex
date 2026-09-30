/**
 * Apex Coco - Person 2 DEMO DATA (Sample -> Opportunity -> Pricing -> Quote -> Onboarding -> Order -> Repeat Business)
 *
 * Run AFTER deploying the metadata and assigning the Apex permission sets:
 *   sf apex run --file scripts/apex/loadDemoData.apex --target-org <alias>
 *
 * All records are labelled DEMO DATA (Account.Description / Product2.Description = 'APEX DEMO DATA') so
 * scripts/apex/resetDemoData.apex can remove them. Values are illustrative, not Apex master data.
 *
 * Golden customer: ABC Foods International (USA importer, Michael Anderson, Coconut Milk Powder, 500 MT/yr,
 * current supplier Competitor A). The Account and Contacts are pre-loaded so the golden demo can start from the
 * Account page (Person 2 stand-alone). To start from the qualified Lead instead (merged Person 1 + Person 2 demo),
 * run scripts/apex/loadGoldenLead.apex afterwards; the Request Sample action attaches the lead to this Account.
 */
final String MARK = 'APEX DEMO DATA';
Date today = Date.today();
User me = [SELECT Id, Name FROM User WHERE Id = :UserInfo.getUserId()];

// ------------------------------------------------------------------ 1. Products and standard price book (USD/MT, DEMO prices)
Pricebook2 standardPb = [SELECT Id, IsActive FROM Pricebook2 WHERE IsStandard = true LIMIT 1];
if (!standardPb.IsActive) { standardPb.IsActive = true; update standardPb; }

Map<String, Decimal[]> productSpec = new Map<String, Decimal[]>{
    // name => {list price per MT, standard cost per MT}
    'Coconut Milk Powder'                 => new Decimal[]{ 3500, 2700 },
    'Coconut Cream Powder'                => new Decimal[]{ 3900, 3100 },
    'Coconut Cream'                       => new Decimal[]{ 2600, 2000 },
    'Desiccated Coconut - Fine'           => new Decimal[]{ 2400, 1900 },
    'Desiccated Coconut - Medium'         => new Decimal[]{ 2350, 1850 },
    'Low-Fat Desiccated Coconut'          => new Decimal[]{ 2600, 2100 },
    'Virgin Coconut Oil'                  => new Decimal[]{ 5200, 4200 },
    'Coconut Flour'                       => new Decimal[]{ 1900, 1500 },
    'Coconut Milk Powder - Private Label' => new Decimal[]{ 3650, 2850 }
};
Map<String, String> productFamily = new Map<String, String>{
    'Coconut Milk Powder' => 'Powders', 'Coconut Cream Powder' => 'Powders', 'Coconut Milk Powder - Private Label' => 'Powders',
    'Coconut Cream' => 'Liquids', 'Virgin Coconut Oil' => 'Oils', 'Coconut Flour' => 'Flour',
    'Desiccated Coconut - Fine' => 'Desiccated', 'Desiccated Coconut - Medium' => 'Desiccated', 'Low-Fat Desiccated Coconut' => 'Desiccated'
};
Map<String, Product2> products = new Map<String, Product2>();
for (Product2 p : [SELECT Id, Name FROM Product2 WHERE Name IN :productSpec.keySet()]) { products.put(p.Name, p); }
List<Product2> newProducts = new List<Product2>();
for (String name : productSpec.keySet()) {
    if (!products.containsKey(name)) {
        newProducts.add(new Product2(Name = name, ProductCode = name.replaceAll('[^A-Za-z]', '').left(10).toUpperCase(), IsActive = true,
            Family = productFamily.get(name), Description = MARK, Standard_Cost__c = productSpec.get(name)[1], Unit_of_Measure__c = 'MT'));
    }
}
insert newProducts;
for (Product2 p : newProducts) { products.put(p.Name, p); }
Map<Id, PricebookEntry> pbeByProduct = new Map<Id, PricebookEntry>();
for (PricebookEntry pbe : [SELECT Id, Product2Id, UnitPrice FROM PricebookEntry WHERE Pricebook2Id = :standardPb.Id AND Product2Id IN :products.values()]) { pbeByProduct.put(pbe.Product2Id, pbe); }
List<PricebookEntry> newPbes = new List<PricebookEntry>();
for (String name : productSpec.keySet()) {
    Product2 p = products.get(name);
    if (!pbeByProduct.containsKey(p.Id)) {
        newPbes.add(new PricebookEntry(Pricebook2Id = standardPb.Id, Product2Id = p.Id, UnitPrice = productSpec.get(name)[0], IsActive = true));
    }
}
insert newPbes;
for (PricebookEntry pbe : newPbes) { pbeByProduct.put(pbe.Product2Id, pbe); }
Product2 cmp = products.get('Coconut Milk Powder');
Product2 ccp = products.get('Coconut Cream Powder');
Product2 cream = products.get('Coconut Cream');
Product2 dcFine = products.get('Desiccated Coconut - Fine');
Product2 dcMed = products.get('Desiccated Coconut - Medium');
Product2 lfdc = products.get('Low-Fat Desiccated Coconut');
Product2 vco = products.get('Virgin Coconut Oil');
Product2 flour = products.get('Coconut Flour');
Product2 cmpPl = products.get('Coconut Milk Powder - Private Label');

// ------------------------------------------------------------------ 2. Accounts and contacts
List<Account> accounts = new List<Account>{
    new Account(Name = 'ABC Foods International', Customer_Type__c = 'Importer', Business_Type__c = 'Food / ingredient importer', Market__c = 'Export', Industry = 'Food & Beverage', Website = 'www.abcfoods-intl.example', BillingCountry = 'United States', BillingState = 'New Jersey', BillingCity = 'Newark', Description = MARK),
    new Account(Name = 'Global Ingredients UK', Customer_Type__c = 'Importer', Business_Type__c = 'Ingredient distributor', Market__c = 'Export', Industry = 'Food & Beverage', BillingCountry = 'United Kingdom', BillingCity = 'Manchester', Description = MARK),
    new Account(Name = 'Nature Brands India', Customer_Type__c = 'Brand', Business_Type__c = 'Consumer food brand', Market__c = 'India', Industry = 'Food & Beverage', BillingCountry = 'India', BillingCity = 'Bengaluru', Description = MARK),
    new Account(Name = 'Pacific Bakers Inc', Customer_Type__c = 'Direct Customer', Business_Type__c = 'Bakery manufacturer', Market__c = 'Export', Industry = 'Food & Beverage', BillingCountry = 'United States', BillingCity = 'Los Angeles', Description = MARK),
    new Account(Name = 'Euro Dairy Alternatives GmbH', Customer_Type__c = 'Private Label', Business_Type__c = 'Plant-based dairy manufacturer', Market__c = 'Export', Industry = 'Food & Beverage', BillingCountry = 'Germany', BillingCity = 'Hamburg', Description = MARK),
    new Account(Name = 'Gulf Trading LLC', Customer_Type__c = 'Distributor/Other', Business_Type__c = 'Food distributor', Market__c = 'Export', Industry = 'Food & Beverage', BillingCountry = 'United Arab Emirates', BillingCity = 'Dubai', Description = MARK),
    new Account(Name = 'Aussie Health Foods Pty', Customer_Type__c = 'Brand', Business_Type__c = 'Health food brand', Market__c = 'Export', Industry = 'Food & Beverage', BillingCountry = 'Australia', BillingCity = 'Melbourne', Description = MARK),
    new Account(Name = 'Nordic Foods AB', Customer_Type__c = 'Importer', Business_Type__c = 'Food importer', Market__c = 'Export', Industry = 'Food & Beverage', BillingCountry = 'Sweden', BillingCity = 'Gothenburg', Description = MARK),
    new Account(Name = 'Mumbai Sweets Pvt Ltd', Customer_Type__c = 'Direct Customer', Business_Type__c = 'Confectionery manufacturer', Market__c = 'India', Industry = 'Food & Beverage', BillingCountry = 'India', BillingCity = 'Mumbai', Description = MARK),
    new Account(Name = 'Sunrise Beverages Ltd', Customer_Type__c = 'Private Label', Business_Type__c = 'Beverage co-packer', Market__c = 'Export', Industry = 'Food & Beverage', BillingCountry = 'United Kingdom', BillingCity = 'Leeds', Description = MARK)
};
insert accounts;
Map<String, Account> acc = new Map<String, Account>();
for (Account a : accounts) { acc.put(a.Name, a); }

List<Contact> contacts = new List<Contact>{
    new Contact(FirstName = 'Michael', LastName = 'Anderson', Title = 'VP Procurement', Email = 'michael.anderson@abcfoods-intl.example', Phone = '+1 973 555 0142', AccountId = acc.get('ABC Foods International').Id, Description = MARK),
    new Contact(FirstName = 'Laura', LastName = 'Chen', Title = 'R&D / QA Manager', Email = 'laura.chen@abcfoods-intl.example', Phone = '+1 973 555 0177', AccountId = acc.get('ABC Foods International').Id, Description = MARK),
    new Contact(FirstName = 'Sarah', LastName = 'Mitchell', Title = 'Logistics Coordinator', Email = 'sarah.mitchell@abcfoods-intl.example', AccountId = acc.get('ABC Foods International').Id, Description = MARK),
    new Contact(FirstName = 'Emma', LastName = 'Clarke', Title = 'Purchasing Director', Email = 'emma.clarke@globalingredients.example', AccountId = acc.get('Global Ingredients UK').Id, Description = MARK),
    new Contact(FirstName = 'James', LastName = 'Whitfield', Title = 'Quality Manager', Email = 'james.whitfield@globalingredients.example', AccountId = acc.get('Global Ingredients UK').Id, Description = MARK),
    new Contact(FirstName = 'Priya', LastName = 'Nair', Title = 'Head of Sourcing', Email = 'priya.nair@naturebrands.example', AccountId = acc.get('Nature Brands India').Id, Description = MARK),
    new Contact(FirstName = 'Daniel', LastName = 'Ortiz', Title = 'Plant Manager', Email = 'daniel.ortiz@pacificbakers.example', AccountId = acc.get('Pacific Bakers Inc').Id, Description = MARK),
    new Contact(FirstName = 'Katrin', LastName = 'Weber', Title = 'Head of Procurement', Email = 'katrin.weber@eurodairy.example', AccountId = acc.get('Euro Dairy Alternatives GmbH').Id, Description = MARK),
    new Contact(FirstName = 'Omar', LastName = 'Haddad', Title = 'General Manager', Email = 'omar.haddad@gulftrading.example', AccountId = acc.get('Gulf Trading LLC').Id, Description = MARK),
    new Contact(FirstName = 'Chloe', LastName = 'Bennett', Title = 'Product Manager', Email = 'chloe.bennett@aussiehealth.example', AccountId = acc.get('Aussie Health Foods Pty').Id, Description = MARK),
    new Contact(FirstName = 'Erik', LastName = 'Lindqvist', Title = 'Buyer', Email = 'erik.lindqvist@nordicfoods.example', AccountId = acc.get('Nordic Foods AB').Id, Description = MARK),
    new Contact(FirstName = 'Rohan', LastName = 'Desai', Title = 'Owner', Email = 'rohan.desai@mumbaisweets.example', AccountId = acc.get('Mumbai Sweets Pvt Ltd').Id, Description = MARK),
    new Contact(FirstName = 'Hannah', LastName = 'Price', Title = 'NPD Manager', Email = 'hannah.price@sunrisebev.example', AccountId = acc.get('Sunrise Beverages Ltd').Id, Description = MARK)
};
insert contacts;
Map<String, Contact> con = new Map<String, Contact>();
for (Contact c : contacts) { con.put(c.Email, c); }
Contact michael = con.get('michael.anderson@abcfoods-intl.example');
Contact laura = con.get('laura.chen@abcfoods-intl.example');

// ------------------------------------------------------------------ 3. Opportunities across the Apex stages (sample rules respected)
// Helper closures are not available in anonymous Apex; build records explicitly.
List<Opportunity> opps = new List<Opportunity>{
    // Sample Requested (stale: no activity, created long ago is simulated by the stale flow after the period)
    new Opportunity(Name = 'Sunrise Beverages Ltd - Coconut Cream', AccountId = acc.get('Sunrise Beverages Ltd').Id, StageName = 'Sample Requested', CloseDate = today.addDays(120), Primary_Product__c = cream.Id, Expected_Annual_Volume__c = 120, Volume_Unit__c = 'MT', Purchase_Timeline__c = '6-12 Months', Opportunity_Type__c = 'New Business', Next_Action__c = 'Prepare and dispatch sample #1', Description = MARK),
    // Sample Testing
    new Opportunity(Name = 'Pacific Bakers Inc - Coconut Flour', AccountId = acc.get('Pacific Bakers Inc').Id, StageName = 'Sample Requested', CloseDate = today.addDays(90), Primary_Product__c = flour.Id, Expected_Annual_Volume__c = 60, Volume_Unit__c = 'MT', Purchase_Timeline__c = '3-6 Months', Opportunity_Type__c = 'New Business', Current_Supplier__c = 'Competitor B', Competitor__c = 'Competitor B', Description = MARK),
    // Technical Evaluation (sample 1 rejected, sample 2 approved)
    new Opportunity(Name = 'Gulf Trading LLC - Desiccated Coconut - Medium', AccountId = acc.get('Gulf Trading LLC').Id, StageName = 'Sample Requested', CloseDate = today.addDays(75), Primary_Product__c = dcMed.Id, Expected_Annual_Volume__c = 240, Volume_Unit__c = 'MT', Purchase_Timeline__c = '3-6 Months', Opportunity_Type__c = 'New Business', Current_Supplier__c = 'Competitor C', Competitor__c = 'Competitor C', Description = MARK),
    // Quotation Sent (quote v1 revised to v2)
    new Opportunity(Name = 'Nature Brands India - Desiccated Coconut - Fine', AccountId = acc.get('Nature Brands India').Id, StageName = 'Sample Requested', CloseDate = today.addDays(45), Primary_Product__c = dcFine.Id, Expected_Annual_Volume__c = 180, Volume_Unit__c = 'MT', Purchase_Timeline__c = '<3 Months', Opportunity_Type__c = 'New Business', Current_Supplier__c = 'Competitor C', Competitor__c = 'Competitor C', Amount = 432000, Description = MARK),
    // Negotiation (discount above threshold, pending approval)
    new Opportunity(Name = 'Euro Dairy Alternatives GmbH - Coconut Milk Powder - Private Label', AccountId = acc.get('Euro Dairy Alternatives GmbH').Id, StageName = 'Sample Requested', CloseDate = today.addDays(30), Primary_Product__c = cmpPl.Id, Expected_Annual_Volume__c = 300, Volume_Unit__c = 'MT', Purchase_Timeline__c = '<3 Months', Opportunity_Type__c = 'New Business', Current_Supplier__c = 'Competitor A', Competitor__c = 'Competitor A', Amount = 1095000, Description = MARK),
    // Customer Approval (onboarding in progress)
    new Opportunity(Name = 'Aussie Health Foods Pty - Virgin Coconut Oil', AccountId = acc.get('Aussie Health Foods Pty').Id, StageName = 'Sample Requested', CloseDate = today.addDays(20), Primary_Product__c = vco.Id, Expected_Annual_Volume__c = 48, Volume_Unit__c = 'MT', Purchase_Timeline__c = '<3 Months', Opportunity_Type__c = 'New Business', Amount = 249600, Description = MARK),
    // Closed Lost with reason (re-engagement path)
    new Opportunity(Name = 'Nordic Foods AB - Low-Fat Desiccated Coconut', AccountId = acc.get('Nordic Foods AB').Id, StageName = 'Sample Requested', CloseDate = today.addDays(-20), Primary_Product__c = lfdc.Id, Expected_Annual_Volume__c = 100, Volume_Unit__c = 'MT', Purchase_Timeline__c = '3-6 Months', Opportunity_Type__c = 'New Business', Current_Supplier__c = 'Competitor B', Competitor__c = 'Competitor B', Amount = 260000, Description = MARK),
    // Closed Won - Global Ingredients UK (repeat customer, 90-day cadence)
    new Opportunity(Name = 'Global Ingredients UK - Coconut Milk Powder', AccountId = acc.get('Global Ingredients UK').Id, StageName = 'Sample Requested', CloseDate = today.addDays(-260), Primary_Product__c = cmp.Id, Expected_Annual_Volume__c = 400, Volume_Unit__c = 'MT', Purchase_Timeline__c = '<3 Months', Opportunity_Type__c = 'New Business', Current_Supplier__c = 'Competitor A', Competitor__c = 'Competitor A', Amount = 340000, Description = MARK),
    // Closed Won - Mumbai Sweets (domestic, 30-day cadence, now overdue)
    new Opportunity(Name = 'Mumbai Sweets Pvt Ltd - Desiccated Coconut - Fine', AccountId = acc.get('Mumbai Sweets Pvt Ltd').Id, StageName = 'Sample Requested', CloseDate = today.addDays(-200), Primary_Product__c = dcFine.Id, Expected_Annual_Volume__c = 240, Volume_Unit__c = 'MT', Purchase_Timeline__c = '<3 Months', Opportunity_Type__c = 'New Business', Amount = 48000, Description = MARK)
};
insert opps;
Map<String, Opportunity> opp = new Map<String, Opportunity>();
for (Opportunity o : opps) { opp.put(o.Name, o); }

// ------------------------------------------------------------------ 4. Sample requests (statuses drive the opportunity automation)
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

// ------------------------------------------------------------------ 5. Advance opportunities to their demo stages (validation rules need the approved-sample dates set by the flows)
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

// ------------------------------------------------------------------ 6. Quotes and quote lines (price history, revisions, approval status)
List<Quote> quotes = new List<Quote>{
    new Quote(Name = 'Nature Brands India - DC Fine 180 MT', OpportunityId = opp.get('Nature Brands India - Desiccated Coconut - Fine').Id, ContactId = con.get('priya.nair@naturebrands.example').Id, Pricebook2Id = standardPb.Id, Status = 'Revised', Quote_Version__c = 1, Quote_Date__c = today.addDays(-40), ExpirationDate = today.addDays(-10), Payment_Terms__c = 'TT 30 Days', Delivery_Terms__c = 'EXW', Competitor_Name__c = 'Competitor C', Competitor_Price__c = 2300, Description = MARK),
    new Quote(Name = 'Euro Dairy - CMP Private Label 300 MT', OpportunityId = opp.get('Euro Dairy Alternatives GmbH - Coconut Milk Powder - Private Label').Id, ContactId = con.get('katrin.weber@eurodairy.example').Id, Pricebook2Id = standardPb.Id, Status = 'Draft', Quote_Version__c = 1, Quote_Date__c = today.addDays(-5), ExpirationDate = today.addDays(25), Payment_Terms__c = 'LC at Sight', Delivery_Terms__c = 'CIF', Competitor_Name__c = 'Competitor A', Competitor_Price__c = 3400, Revision_Reason__c = 'Customer asked for 8% off list to match Competitor A - needs approval (DEMO threshold 5%)', Description = MARK),
    new Quote(Name = 'Aussie Health - VCO 48 MT', OpportunityId = opp.get('Aussie Health Foods Pty - Virgin Coconut Oil').Id, ContactId = con.get('chloe.bennett@aussiehealth.example').Id, Pricebook2Id = standardPb.Id, Status = 'Accepted', Quote_Version__c = 1, Quote_Date__c = today.addDays(-30), ExpirationDate = today.addDays(30), Payment_Terms__c = '30% Advance / 70% against BL', Delivery_Terms__c = 'FOB', Description = MARK),
    new Quote(Name = 'Nordic Foods - LFDC 100 MT', OpportunityId = opp.get('Nordic Foods AB - Low-Fat Desiccated Coconut').Id, ContactId = con.get('erik.lindqvist@nordicfoods.example').Id, Pricebook2Id = standardPb.Id, Status = 'Rejected', Quote_Version__c = 1, Quote_Date__c = today.addDays(-80), ExpirationDate = today.addDays(-50), Payment_Terms__c = 'TT 30 Days', Delivery_Terms__c = 'CIF', Competitor_Name__c = 'Competitor B', Competitor_Price__c = 2450, Description = MARK),
    new Quote(Name = 'Global Ingredients UK - CMP 100 MT (Jan-Sep supply)', OpportunityId = opp.get('Global Ingredients UK - Coconut Milk Powder').Id, ContactId = con.get('emma.clarke@globalingredients.example').Id, Pricebook2Id = standardPb.Id, Status = 'Accepted', Quote_Version__c = 1, Quote_Date__c = today.addDays(-290), ExpirationDate = today.addDays(-260), Payment_Terms__c = 'LC at Sight', Delivery_Terms__c = 'FOB', Description = MARK),
    new Quote(Name = 'Mumbai Sweets - DC Fine 20 MT monthly', OpportunityId = opp.get('Mumbai Sweets Pvt Ltd - Desiccated Coconut - Fine').Id, ContactId = con.get('rohan.desai@mumbaisweets.example').Id, Pricebook2Id = standardPb.Id, Status = 'Accepted', Quote_Version__c = 1, Quote_Date__c = today.addDays(-220), ExpirationDate = today.addDays(-190), Payment_Terms__c = 'TT 30 Days', Delivery_Terms__c = 'EXW', Description = MARK)
};
insert quotes;
List<QuoteLineItem> qlis = new List<QuoteLineItem>{
    new QuoteLineItem(QuoteId = quotes[0].Id, PricebookEntryId = pbeByProduct.get(dcFine.Id).Id, Quantity = 180, UnitPrice = 2400, Supply_Period_From__c = today.addDays(-30), Supply_Period_To__c = today.addDays(335)),
    new QuoteLineItem(QuoteId = quotes[1].Id, PricebookEntryId = pbeByProduct.get(cmpPl.Id).Id, Quantity = 300, UnitPrice = 3650, Discount = 8, Supply_Period_From__c = today.addDays(30), Supply_Period_To__c = today.addDays(395)),
    new QuoteLineItem(QuoteId = quotes[2].Id, PricebookEntryId = pbeByProduct.get(vco.Id).Id, Quantity = 48, UnitPrice = 5200, Supply_Period_From__c = today.addDays(15), Supply_Period_To__c = today.addDays(380)),
    new QuoteLineItem(QuoteId = quotes[3].Id, PricebookEntryId = pbeByProduct.get(lfdc.Id).Id, Quantity = 100, UnitPrice = 2600),
    new QuoteLineItem(QuoteId = quotes[4].Id, PricebookEntryId = pbeByProduct.get(cmp.Id).Id, Quantity = 100, UnitPrice = 3400, Supply_Period_From__c = today.addDays(-260), Supply_Period_To__c = today.addDays(-20)),
    new QuoteLineItem(QuoteId = quotes[5].Id, PricebookEntryId = pbeByProduct.get(dcFine.Id).Id, Quantity = 20, UnitPrice = 2400)
};
insert qlis;
// Nature Brands revision v2 (price held, discount 3%, within threshold)
Quote nbV2 = new Quote(Name = 'Nature Brands India - DC Fine 180 MT', OpportunityId = quotes[0].OpportunityId, ContactId = quotes[0].ContactId, Pricebook2Id = standardPb.Id, Status = 'Sent', Quote_Version__c = 2, Previous_Quote__c = quotes[0].Id, Quote_Date__c = today.addDays(-8), ExpirationDate = today.addDays(22), Payment_Terms__c = 'TT 30 Days', Delivery_Terms__c = 'EXW', Competitor_Name__c = 'Competitor C', Competitor_Price__c = 2300, Revision_Reason__c = 'Customer benchmarked Competitor C at 2,300; offered 3% for 12-month commitment', Description = MARK);
insert nbV2;
insert new QuoteLineItem(QuoteId = nbV2.Id, PricebookEntryId = pbeByProduct.get(dcFine.Id).Id, Quantity = 180, UnitPrice = 2400, Discount = 3, Supply_Period_From__c = today.addDays(30), Supply_Period_To__c = today.addDays(395));

// ------------------------------------------------------------------ 7. Move commercial opportunities to their final demo stages
refreshed = new Map<Id, Opportunity>([SELECT Id, Name, StageName FROM Opportunity WHERE Id IN :opps]);
stageUpdates = new List<Opportunity>();
o = refreshed.get(opp.get('Nature Brands India - Desiccated Coconut - Fine').Id); o.StageName = 'Quotation Sent'; o.Next_Action__c = 'Follow up on quote v2'; stageUpdates.add(o);
o = refreshed.get(opp.get('Euro Dairy Alternatives GmbH - Coconut Milk Powder - Private Label').Id); o.StageName = 'Negotiation'; o.Next_Action__c = 'Submit 8% discount for approval'; stageUpdates.add(o);
o = refreshed.get(opp.get('Aussie Health Foods Pty - Virgin Coconut Oil').Id); o.StageName = 'Customer Approval'; o.Next_Action__c = 'Complete onboarding checklist, collect PO'; stageUpdates.add(o);
o = refreshed.get(opp.get('Nordic Foods AB - Low-Fat Desiccated Coconut').Id); o.StageName = 'Closed Lost'; o.Loss_Reason__c = 'Price'; o.Loss_Details__c = 'Competitor B at 2,450/MT CIF Gothenburg. Buyer open to re-quote for next season.'; stageUpdates.add(o);
o = refreshed.get(opp.get('Global Ingredients UK - Coconut Milk Powder').Id); o.StageName = 'PO Received'; o.PO_Number__c = 'GI-PO-2026-014'; o.PO_Date__c = today.addDays(-262); o.PO_Quantity__c = 100; stageUpdates.add(o);
o = refreshed.get(opp.get('Mumbai Sweets Pvt Ltd - Desiccated Coconut - Fine').Id); o.StageName = 'PO Received'; o.PO_Number__c = 'MS-PO-0921'; o.PO_Date__c = today.addDays(-190); o.PO_Quantity__c = 20; stageUpdates.add(o);
update stageUpdates;

// ------------------------------------------------------------------ 8. Orders: history for the repeat-business engine (activated one by one, oldest first)
// The PO Received automation created one Draft order per won opportunity; add the historical repeat orders.
List<Order> autoOrders = [SELECT Id, AccountId, OpportunityId, EffectiveDate FROM Order WHERE OpportunityId IN :opps];
List<Order> history = new List<Order>();
Integer[] giOffsets = new Integer[]{ -172, -82 };          // + the auto order at -262 => Jan / Apr / Jul style 90-day cadence
for (Integer off : giOffsets) {
    history.add(new Order(AccountId = acc.get('Global Ingredients UK').Id, OpportunityId = opp.get('Global Ingredients UK - Coconut Milk Powder').Id, Pricebook2Id = standardPb.Id, Status = 'Draft', EffectiveDate = today.addDays(off), PoNumber = 'GI-PO-2026-' + String.valueOf(Math.abs(off)), PoDate = today.addDays(off - 2), Description = MARK));
}
Integer[] msOffsets = new Integer[]{ -160, -130, -100, -70 };  // 30-day cadence, last order 70 days ago => overdue
for (Integer off : msOffsets) {
    history.add(new Order(AccountId = acc.get('Mumbai Sweets Pvt Ltd').Id, OpportunityId = opp.get('Mumbai Sweets Pvt Ltd - Desiccated Coconut - Fine').Id, Pricebook2Id = standardPb.Id, Status = 'Draft', EffectiveDate = today.addDays(off), PoNumber = 'MS-PO-' + String.valueOf(1000 + off), PoDate = today.addDays(off - 1), Description = MARK));
}
insert history;
List<OrderItem> items = new List<OrderItem>();
for (Order h : history) {
    Boolean gi = h.AccountId == acc.get('Global Ingredients UK').Id;
    items.add(new OrderItem(OrderId = h.Id, PricebookEntryId = pbeByProduct.get(gi ? cmp.Id : dcFine.Id).Id, Quantity = gi ? 100 : 20, UnitPrice = gi ? 3400 : 2400));
}
insert items;
List<Order> toActivate = [SELECT Id, EffectiveDate FROM Order WHERE (Id IN :history OR Id IN :autoOrders) AND Status = 'Draft' ORDER BY EffectiveDate ASC];
for (Order ord : toActivate) { ord.Status = 'Activated'; update ord; }   // one at a time so the reorder roll-up sees the sequence

// Mark the historical Global Ingredients orders as already handed to SAP (simulated)
List<Order> giOrders = [SELECT Id, OrderNumber FROM Order WHERE AccountId = :acc.get('Global Ingredients UK').Id ORDER BY EffectiveDate ASC];
List<Integration_Log__c> logs = new List<Integration_Log__c>();
for (Order ord : giOrders) {
    ord.SAP_Status__c = 'Invoiced'; ord.SAP_Order_Number__c = '45' + ord.OrderNumber.right(6); ord.SAP_Invoice_Number__c = '90' + ord.OrderNumber.right(6); ord.SAP_Sent_Date_Time__c = Datetime.now().addDays(-100); ord.SAP_Last_Response__c = 'SIMULATED: invoiced';
    logs.add(new Integration_Log__c(Order__c = ord.Id, Record_Type_Name__c = 'Order', Salesforce_Record_Id__c = ord.Id, Direction__c = 'Outbound', Status__c = 'Sent', Integration_Mode__c = 'Mock (Demo)', Target_System__c = 'SAP ERP', Sent_Date_Time__c = Datetime.now().addDays(-100), Payload_Summary__c = 'SIMULATED SAP PAYLOAD (DEMO) for order ' + ord.OrderNumber));
    logs.add(new Integration_Log__c(Order__c = ord.Id, Record_Type_Name__c = 'Order', Salesforce_Record_Id__c = ord.Id, Direction__c = 'Inbound', Status__c = 'Acknowledged', Integration_Mode__c = 'Mock (Demo)', Target_System__c = 'SAP ERP', Sent_Date_Time__c = Datetime.now().addDays(-100), Response_Summary__c = 'SIMULATED SAP RESPONSE (DEMO): SAP SO 45' + ord.OrderNumber.right(6) + ' invoiced'));
}
update giOrders;
insert logs;

// ------------------------------------------------------------------ 9. Competitor intel
insert new List<Competitor_Intel__c>{
    new Competitor_Intel__c(Competitor_Name__c = 'Competitor A', Account__c = acc.get('ABC Foods International').Id, Product__c = cmp.Id, Quoted_Price__c = 3400, Price_Unit__c = 'per MT', Customer_Preference__c = 'Lower price', Strength__c = 'Price', Weakness__c = 'Lead time (8-10 weeks) and inconsistent particle size', Source__c = 'Customer Discussion', Intel_Date__c = today.addDays(-3), Notes__c = MARK),
    new Competitor_Intel__c(Competitor_Name__c = 'Competitor A', Account__c = acc.get('Euro Dairy Alternatives GmbH').Id, Opportunity__c = opp.get('Euro Dairy Alternatives GmbH - Coconut Milk Powder - Private Label').Id, Product__c = cmpPl.Id, Quoted_Price__c = 3400, Price_Unit__c = 'per MT', Customer_Preference__c = 'Lower price, shorter supply commitment', Strength__c = 'Price', Weakness__c = 'No private-label packaging service', Source__c = 'Customer Discussion', Intel_Date__c = today.addDays(-6), Notes__c = MARK),
    new Competitor_Intel__c(Competitor_Name__c = 'Competitor B', Account__c = acc.get('Nordic Foods AB').Id, Opportunity__c = opp.get('Nordic Foods AB - Low-Fat Desiccated Coconut').Id, Product__c = lfdc.Id, Quoted_Price__c = 2450, Price_Unit__c = 'per MT', Customer_Preference__c = 'Price', Strength__c = 'Freight advantage to Scandinavia', Weakness__c = 'Quality complaints on moisture', Source__c = 'Customer Discussion', Intel_Date__c = today.addDays(-25), Notes__c = MARK),
    new Competitor_Intel__c(Competitor_Name__c = 'Competitor C', Account__c = acc.get('Nature Brands India').Id, Opportunity__c = opp.get('Nature Brands India - Desiccated Coconut - Fine').Id, Product__c = dcFine.Id, Quoted_Price__c = 2300, Price_Unit__c = 'per MT', Customer_Preference__c = 'Consistent grade and delivery reliability', Strength__c = 'Domestic freight', Weakness__c = 'No BRC certification', Source__c = 'Trade Show', Intel_Date__c = today.addDays(-15), Notes__c = MARK)
};

// ------------------------------------------------------------------ 10. Onboarding (Customer Approval automation created one for Aussie Health); complete Global Ingredients
List<Customer_Onboarding__c> onb = [SELECT Id, Status__c FROM Customer_Onboarding__c WHERE Opportunity__c = :opp.get('Aussie Health Foods Pty - Virgin Coconut Oil').Id];
for (Customer_Onboarding__c ob : onb) { ob.Company_Information_Status__c = 'Complete'; ob.Quality_Status__c = 'In Progress'; ob.Finance_Status__c = 'Complete'; }
update onb;
insert new Customer_Onboarding__c(Account__c = acc.get('Global Ingredients UK').Id, Opportunity__c = opp.get('Global Ingredients UK - Coconut Milk Powder').Id, Due_Date__c = today.addDays(-270), Company_Information_Status__c = 'Complete', Finance_Status__c = 'Complete', Quality_Status__c = 'Complete', Logistics_Status__c = 'Complete', Compliance_Status__c = 'Complete', Notes__c = MARK);

// ------------------------------------------------------------------ 11. Complaints (Cases) routed to the Quality queue by flow
Order giLast = giOrders[giOrders.size() - 1];
insert new List<Case>{
    new Case(Subject = 'Off-odour in 3 bags of lot CMP-2607-031', Description = 'Customer reports rancid odour in 3 x 25 kg bags from the July shipment. Photos attached by email. ' + MARK, AccountId = acc.get('Global Ingredients UK').Id, ContactId = con.get('james.whitfield@globalingredients.example').Id, Origin = 'Email', Status = 'New', Complaint_Type__c = 'Quality', Complaint_Product__c = cmp.Id, Batch_Number__c = 'CMP-2607-031', Order__c = giLast.Id),
    new Case(Subject = 'Torn outer packaging on pallet 4', Description = 'Two cartons damaged in transit. ' + MARK, AccountId = acc.get('Mumbai Sweets Pvt Ltd').Id, ContactId = con.get('rohan.desai@mumbaisweets.example').Id, Origin = 'Phone', Status = 'Working', Complaint_Type__c = 'Packaging', Complaint_Product__c = dcFine.Id, Batch_Number__c = 'DCF-2607-015', Resolution__c = 'Replacement cartons dispatched.'),
    new Case(Subject = 'COA missing for batch DCF-2606-008', Description = 'Customer needs the certificate of analysis for customs clearance. ' + MARK, AccountId = acc.get('Mumbai Sweets Pvt Ltd').Id, Origin = 'Email', Status = 'Closed', Complaint_Type__c = 'Documentation', Complaint_Product__c = dcFine.Id, Batch_Number__c = 'DCF-2606-008', Resolution__c = 'COA re-issued by Quality.')
};

// ------------------------------------------------------------------ 12. Activities on the golden account (long-cycle nurture history)
insert new List<Task>{
    new Task(Subject = 'Met at International Food Expo - scanned card', Status = 'Completed', Priority = 'Normal', ActivityDate = today.addDays(-258), WhoId = michael.Id, WhatId = acc.get('ABC Foods International').Id, Description = 'Interested in Coconut Milk Powder, ~500 MT/yr, currently buying from Competitor A at about 3,400/MT. ' + MARK),
    new Task(Subject = 'Call - indicative price discussed (no opportunity yet)', Status = 'Completed', Priority = 'Normal', ActivityDate = today.addDays(-240), WhoId = michael.Id, WhatId = acc.get('ABC Foods International').Id, Description = 'Quotation request is not an opportunity until they ask for samples. ' + MARK),
    new Task(Subject = 'WhatsApp - Laura Chen (R&D) wants samples for reconstitution trials', Status = 'Completed', Priority = 'High', ActivityDate = today.addDays(-1), WhoId = laura.Id, WhatId = acc.get('ABC Foods International').Id, Description = 'Ready to create the Sample Request. ' + MARK),
    // Old completed activity on Sunrise so its opportunity shows as STALE (Last Activity 45 days ago > 30-day DEMO threshold)
    new Task(Subject = 'Intro call - sample requested', Status = 'Completed', Priority = 'Normal', ActivityDate = today.addDays(-45), WhoId = con.get('hannah.price@sunrisebev.example').Id, WhatId = opp.get('Sunrise Beverages Ltd - Coconut Cream').Id, Description = 'No follow-up since. ' + MARK),
    new Task(Subject = 'Sent tracking details to Daniel', Status = 'Completed', Priority = 'Normal', ActivityDate = today.addDays(-8), WhoId = con.get('daniel.ortiz@pacificbakers.example').Id, WhatId = opp.get('Pacific Bakers Inc - Coconut Flour').Id, Description = MARK)
};

// ------------------------------------------------------------------ 13. Demo users (best effort: depends on available licences) and permission sets for the running user
List<PermissionSet> psets = [SELECT Id, Name FROM PermissionSet WHERE Name IN ('Apex_Sales_Executive', 'Apex_Sales_Manager', 'Apex_Sales_Admin', 'Apex_Management')];
Set<Id> assigned = new Set<Id>();
for (PermissionSetAssignment psa : [SELECT PermissionSetId FROM PermissionSetAssignment WHERE AssigneeId = :me.Id]) { assigned.add(psa.PermissionSetId); }
List<PermissionSetAssignment> newPsa = new List<PermissionSetAssignment>();
for (PermissionSet ps : psets) { if (!assigned.contains(ps.Id)) { newPsa.add(new PermissionSetAssignment(AssigneeId = me.Id, PermissionSetId = ps.Id)); } }
insert newPsa;

System.debug('APEX DEMO DATA LOADED for ' + me.Name + ' | accounts=' + accounts.size() + ' opportunities=' + opps.size() + ' samples=' + (samples.size() + 1) + ' quotes=' + (quotes.size() + 1) + ' orders=' + toActivate.size());
