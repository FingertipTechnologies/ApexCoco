/**
 * Apex Coco - Person 2 DEMO DATA, part 5 of 5: finance mirror (Invoices, Payments, Credit Notes - DEMO copies of SAP documents).
 * Run after parts 1-4. Safe to run on an org that already has parts 1-4 loaded; it skips if invoices already exist.
 *   sf apex run --file scripts/apex/loadDemoData_5_Finance.apex
 */
final String MARK = 'APEX DEMO DATA';
Date today = Date.today();
Map<String, Account> acc = new Map<String, Account>();
for (Account a : [SELECT Id, Name FROM Account WHERE Name IN ('Global Ingredients UK', 'Mumbai Sweets Pvt Ltd')]) { acc.put(a.Name, a); }
if (![SELECT Id FROM Invoice__c WHERE Account__c IN :acc.values() LIMIT 1].isEmpty()) { System.debug('Finance demo data already loaded - nothing to do.'); return; }

// Invoices mirrored from SAP: Global Ingredients (paid, paid, partially paid + overdue), Mumbai Sweets (paid)
List<Order> giSorted = [SELECT Id, OrderNumber, EffectiveDate, TotalAmount, OpportunityId FROM Order WHERE AccountId = :acc.get('Global Ingredients UK').Id ORDER BY EffectiveDate ASC];
List<Order> msSorted = [SELECT Id, OrderNumber, EffectiveDate, TotalAmount, OpportunityId FROM Order WHERE AccountId = :acc.get('Mumbai Sweets Pvt Ltd').Id ORDER BY EffectiveDate ASC];
List<Invoice__c> invoices = new List<Invoice__c>();
for (Order o : giSorted) {
    invoices.add(new Invoice__c(Account__c = acc.get('Global Ingredients UK').Id, Order__c = o.Id, Opportunity__c = o.OpportunityId, Invoice_Number__c = '90' + o.OrderNumber.right(6), Invoice_Date__c = o.EffectiveDate.addDays(20), Due_Date__c = o.EffectiveDate.addDays(50), Amount__c = o.TotalAmount, Payment_Terms__c = 'TT 30 Days', Source_System__c = 'SAP (Mock)', Notes__c = MARK));
}
for (Order o : msSorted) {
    invoices.add(new Invoice__c(Account__c = acc.get('Mumbai Sweets Pvt Ltd').Id, Order__c = o.Id, Opportunity__c = o.OpportunityId, Invoice_Number__c = '90' + o.OrderNumber.right(6), Invoice_Date__c = o.EffectiveDate.addDays(5), Due_Date__c = o.EffectiveDate.addDays(35), Amount__c = o.TotalAmount, Payment_Terms__c = 'TT 30 Days', Source_System__c = 'SAP (Mock)', Notes__c = MARK));
}
insert invoices;

// Payments: every invoice paid in full except the latest Global Ingredients invoice (40% paid, now overdue)
List<Payment__c> payments = new List<Payment__c>();
for (Integer i = 0; i < invoices.size(); i++) {
    Invoice__c inv = invoices[i];
    Boolean lastGi = (i == giSorted.size() - 1);
    Decimal amt = lastGi ? (inv.Amount__c * 0.4).setScale(2) : inv.Amount__c;
    payments.add(new Payment__c(Account__c = inv.Account__c, Invoice__c = inv.Id, Payment_Date__c = inv.Due_Date__c.addDays(lastGi ? 3 : -2), Amount__c = amt, Method__c = 'Telegraphic Transfer', Reference__c = 'TT-' + inv.Invoice_Number__c, Status__c = 'Received', Notes__c = MARK));
}
insert payments;   // the after-save flow rolls Amount Paid up to each invoice

// Credit note against the open quality complaint, applied to the latest Global Ingredients invoice
List<Case> giCases = [SELECT Id FROM Case WHERE AccountId = :acc.get('Global Ingredients UK').Id AND Complaint_Type__c = 'Quality' ORDER BY CreatedDate DESC LIMIT 1];
Invoice__c giInv = invoices[giSorted.size() - 1];
insert new Credit_Note__c(Account__c = acc.get('Global Ingredients UK').Id, Invoice__c = giInv.Id, Case__c = giCases.isEmpty() ? null : giCases[0].Id, Credit_Date__c = today.addDays(-2), Amount__c = 10200, Reason__c = 'Quality Complaint', Status__c = 'Issued', SAP_Reference__c = 'CN-' + giInv.Invoice_Number__c, Notes__c = '3 x 25 kg bags off-odour, lot CMP-2607-031. ' + MARK);
System.debug('Part 5 done: invoices=' + invoices.size() + ' payments=' + payments.size() + ' credit notes=1');
