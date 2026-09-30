/**
 * Apex Coco - Person 2: remove all demo records (anything created by loadDemoData_1..4 scripts / loadGoldenLead.apex
 * and everything created during a demo run on those customers). Products and price book entries are kept
 * unless KEEP_PRODUCTS is set to false.
 *
 *   sf apex run --file scripts/apex/resetDemoData.apex --target-org <alias>
 */
final String MARK = 'APEX DEMO DATA';
final Boolean KEEP_PRODUCTS = true;

Set<String> demoCompanies = new Set<String>{ 'ABC Foods International', 'Global Ingredients UK', 'Nature Brands India', 'Pacific Bakers Inc', 'Euro Dairy Alternatives GmbH',
    'Gulf Trading LLC', 'Aussie Health Foods Pty', 'Nordic Foods AB', 'Mumbai Sweets Pvt Ltd', 'Sunrise Beverages Ltd' };
List<Account> accounts = [SELECT Id FROM Account WHERE Name IN :demoCompanies];
Set<Id> accIds = new Map<Id, Account>(accounts).keySet();

delete [SELECT Id FROM Integration_Log__c WHERE Order__c IN (SELECT Id FROM Order WHERE AccountId IN :accIds) OR Opportunity__c IN (SELECT Id FROM Opportunity WHERE AccountId IN :accIds)];
delete [SELECT Id FROM Credit_Note__c WHERE Account__c IN :accIds];
delete [SELECT Id FROM Payment__c WHERE Account__c IN :accIds];
delete [SELECT Id FROM Invoice__c WHERE Account__c IN :accIds];
delete [SELECT Id FROM Case WHERE AccountId IN :accIds];
List<Order> orders = [SELECT Id, Status FROM Order WHERE AccountId IN :accIds];
for (Order o : orders) { o.Status = 'Draft'; }
update orders;                       // activated orders cannot be deleted
delete orders;
delete [SELECT Id FROM Quote WHERE AccountId IN :accIds];
delete [SELECT Id FROM Customer_Onboarding__c WHERE Account__c IN :accIds];
delete [SELECT Id FROM Competitor_Intel__c WHERE Account__c IN :accIds];
delete [SELECT Id FROM Sample_Request__c WHERE Account__c IN :accIds];
delete [SELECT Id FROM Task WHERE WhatId IN :accIds OR WhatId IN (SELECT Id FROM Opportunity WHERE AccountId IN :accIds)];
delete [SELECT Id FROM Opportunity WHERE AccountId IN :accIds];
delete [SELECT Id FROM Contact WHERE AccountId IN :accIds];
delete accounts;
delete [SELECT Id FROM Lead WHERE Company IN :demoCompanies AND IsConverted = false];
if (!KEEP_PRODUCTS) {
    List<Product2> prods = [SELECT Id FROM Product2 WHERE Name IN ('Coconut Milk Powder', 'Coconut Cream Powder', 'Coconut Cream', 'Desiccated Coconut - Fine', 'Desiccated Coconut - Medium', 'Low-Fat Desiccated Coconut', 'Virgin Coconut Oil', 'Coconut Flour', 'Coconut Milk Powder - Private Label')];
    delete [SELECT Id FROM PricebookEntry WHERE Product2Id IN :prods];
    delete prods;
}
System.debug('APEX DEMO DATA removed. Run loadDemoData_1..4 scripts to reload.');
