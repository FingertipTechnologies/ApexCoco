/**
 * Apex Coco - Person 2 DEMO DATA, part 3 of 4: quotes and revisions, PO / order stages, order history for the repeat-business engine, simulated SAP marks
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
Map<String, Opportunity> opp = new Map<String, Opportunity>();
for (Opportunity o0 : [SELECT Id, Name FROM Opportunity WHERE AccountId IN :acc.values() AND Opportunity_Type__c = 'New Business']) { opp.put(o0.Name, o0); }
List<Opportunity> opps = opp.values();
// ---- Quotes and quote lines (price history, revisions, approval status)
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
// ---- Move commercial opportunities to their final demo stages
Map<Id, Opportunity> refreshed = new Map<Id, Opportunity>([SELECT Id, Name, StageName FROM Opportunity WHERE Id IN :opps]);
List<Opportunity> stageUpdates = new List<Opportunity>();
Opportunity o;
o = refreshed.get(opp.get('Nature Brands India - Desiccated Coconut - Fine').Id); o.StageName = 'Quotation Sent'; o.Next_Action__c = 'Follow up on quote v2'; stageUpdates.add(o);
o = refreshed.get(opp.get('Euro Dairy Alternatives GmbH - Coconut Milk Powder - Private Label').Id); o.StageName = 'Negotiation'; o.Next_Action__c = 'Submit 8% discount for approval'; stageUpdates.add(o);
o = refreshed.get(opp.get('Aussie Health Foods Pty - Virgin Coconut Oil').Id); o.StageName = 'Customer Approval'; o.Next_Action__c = 'Complete onboarding checklist, collect PO'; stageUpdates.add(o);
o = refreshed.get(opp.get('Nordic Foods AB - Low-Fat Desiccated Coconut').Id); o.StageName = 'Closed Lost'; o.Loss_Reason__c = 'Price'; o.Loss_Details__c = 'Competitor B at 2,450/MT CIF Gothenburg. Buyer open to re-quote for next season.'; stageUpdates.add(o);
o = refreshed.get(opp.get('Global Ingredients UK - Coconut Milk Powder').Id); o.StageName = 'PO Received'; o.PO_Number__c = 'GI-PO-2026-014'; o.PO_Date__c = today.addDays(-262); o.PO_Quantity__c = 100; stageUpdates.add(o);
o = refreshed.get(opp.get('Mumbai Sweets Pvt Ltd - Desiccated Coconut - Fine').Id); o.StageName = 'PO Received'; o.PO_Number__c = 'MS-PO-0921'; o.PO_Date__c = today.addDays(-190); o.PO_Quantity__c = 20; stageUpdates.add(o);
update stageUpdates;
// ---- Orders: history for the repeat-business engine (activated one by one, oldest first)
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
System.debug('Part 3 done: quotes=' + (quotes.size() + 1) + ' orders activated=' + toActivate.size());
