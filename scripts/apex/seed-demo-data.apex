// Seeds the Workstream 1 demo data. Run with:
//   sf apex run --file scripts/apex/seed-demo-data.apex --target-org <alias>
// 1) ABC Foods International Lead (shared with Workstream 2, spec "Demo data").
// 2) Optional existing customer "Fingertip" (Account + Contact) so scanning the
//    Ameen Azeez sample card demonstrates "Potential Existing Customer Found".
//    Set seedExistingCustomer = false to demo the "New Prospect" path instead.
Boolean seedExistingCustomer = true;

if ([SELECT COUNT() FROM Lead WHERE Email = 'john.smith@abcfoods.com'] == 0) {
    insert new Lead(
        FirstName = 'John', LastName = 'Smith', Title = 'Procurement Manager', Company = 'ABC Foods International',
        Email = 'john.smith@abcfoods.com', Phone = '+1 415 555 0100', Website = 'abcfoods.com', Country = 'USA',
        LeadSource = 'Trade Show / Exhibition', Event_Name__c = 'Gulfood 2026', Customer_Type__c = 'Importer',
        Interested_Product__c = 'Coconut Milk Powder', Expected_Annual_Volume__c = 500, Volume_Unit__c = 'MT',
        Purchase_Timeline__c = '3–6 Months', Current_Supplier__c = 'Competitor A', Competitor__c = 'Competitor A',
        Potential_Rating__c = 'High', Qualification_Notes__c = 'Requires coconut milk powder. Met at Gulfood 2026.',
        Scan_Source__c = 'Visiting Card Scan', Scan_Status__c = 'Extracted', Scan_Provider__c = 'Demo data',
        Status = 'Open - Not Contacted'
    );
    System.debug('Created ABC Foods International Lead');
}

if (seedExistingCustomer && [SELECT COUNT() FROM Account WHERE Name = 'Fingertip'] == 0) {
    Account a = new Account(Name = 'Fingertip', Website = 'https://www.fingertipplus.com', Phone = '+91 94950 72255', Industry = 'Technology', Type = 'Customer - Direct');
    insert a;
    insert new Contact(FirstName = 'Ameen', LastName = 'Azeez', Title = 'Head of Sales', Email = 'ameen@fingertipplus.com', MobilePhone = '9495072255', AccountId = a.Id);
    System.debug('Created existing customer Fingertip / Ameen Azeez');
}
