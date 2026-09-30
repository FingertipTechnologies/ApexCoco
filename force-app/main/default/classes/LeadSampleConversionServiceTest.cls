@IsTest
private class LeadSampleConversionServiceTest {

    private static Lead makeLead(String company, String email) {
        String openStatus = [SELECT MasterLabel FROM LeadStatus WHERE IsConverted = false ORDER BY SortOrder ASC LIMIT 1].MasterLabel;
        Lead ld = new Lead(FirstName = 'Michael', LastName = 'Anderson', Company = company, Email = email,
                           Status = openStatus, Country = 'USA');
        insert ld;
        return ld;
    }

    private static List<LeadSampleConversionService.Result> run(Id leadId) {
        LeadSampleConversionService.Request req = new LeadSampleConversionService.Request();
        req.leadId = leadId;
        return LeadSampleConversionService.convertLeads(new List<LeadSampleConversionService.Request>{ req });
    }

    @IsTest
    static void convertsLeadToNewAccountAndContactWithoutOpportunity() {
        Lead ld = makeLead('ABC Foods International', 'michael.anderson@abcfoods.example');

        Test.startTest();
        List<LeadSampleConversionService.Result> results = run(ld.Id);
        Test.stopTest();

        System.assertEquals(1, results.size());
        LeadSampleConversionService.Result res = results[0];
        System.assertNotEquals(null, res.accountId, 'Account should be created');
        System.assertNotEquals(null, res.contactId, 'Contact should be created');
        System.assertEquals(false, res.wasAlreadyConverted);
        System.assertEquals(false, res.matchedExistingAccount);

        Lead converted = [SELECT IsConverted, ConvertedOpportunityId FROM Lead WHERE Id = :ld.Id];
        System.assert(converted.IsConverted, 'Lead must be converted');
        System.assertEquals(null, converted.ConvertedOpportunityId, 'Standard opportunity must not be created; the flow creates the Apex opportunity');
        System.assertEquals(0, [SELECT COUNT() FROM Opportunity]);
    }

    @IsTest
    static void attachesToExistingAccountAndContact() {
        Account existing = new Account(Name = 'Global Ingredients UK');
        insert existing;
        Contact existingContact = new Contact(FirstName = 'Emma', LastName = 'Clarke', AccountId = existing.Id, Email = 'emma.clarke@globalingredients.example');
        insert existingContact;
        Lead ld = makeLead('Global Ingredients UK', 'emma.clarke@globalingredients.example');

        Test.startTest();
        LeadSampleConversionService.Result res = run(ld.Id)[0];
        Test.stopTest();

        System.assertEquals(existing.Id, res.accountId, 'Existing customer must be reused (duplicate prevention)');
        System.assertEquals(existingContact.Id, res.contactId, 'Existing contact must be reused');
        System.assertEquals(true, res.matchedExistingAccount);
        System.assertEquals(1, [SELECT COUNT() FROM Account WHERE Name = 'Global Ingredients UK']);
    }

    @IsTest
    static void reusesResultWhenLeadAlreadyConverted() {
        Lead ld = makeLead('Nature Brands India', 'buyer@naturebrands.example');
        LeadSampleConversionService.Result first = run(ld.Id)[0];

        Test.startTest();
        LeadSampleConversionService.Result second = run(ld.Id)[0];
        Test.stopTest();

        System.assertEquals(true, second.wasAlreadyConverted);
        System.assertEquals(first.accountId, second.accountId);
        System.assertEquals(first.contactId, second.contactId);
    }
}
