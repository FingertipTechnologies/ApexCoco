@IsTest
private class LeadDuplicateCheckServiceTest {
    @TestSetup
    static void seed() {
        Account fingertip = new Account(Name = 'Fingertip', Website = 'https://www.fingertipplus.com', Phone = '+91 94950 72255', Industry = 'Technology');
        Account other = new Account(Name = 'Northwind Traders', Website = 'https://northwind.example.com', Phone = '+44 20 7946 0000');
        insert new List<Account>{ fingertip, other };
        insert new Contact(FirstName = 'Ameen', LastName = 'Azeez', Title = 'Head of Sales', Email = 'ameen@fingertipplus.com', MobilePhone = '94950 72255', AccountId = fingertip.Id);
        insert new Lead(FirstName = 'Priya', LastName = 'Nair', Company = 'Bloom Organics', Email = 'priya@bloomorganics.example.com', MobilePhone = '+91 98950 44556', Status = 'Open - Not Contacted');
    }

    private static VisitingCardData ameen() {
        return VisitingCardData.fromMap(new Map<String, Object>{
            'firstName' => 'Ameen', 'lastName' => 'Azeez', 'company' => 'Fingertip', 'mobile' => '9495072255',
            'email' => 'ameen@fingertipplus.com', 'website' => 'www.fingertipplus.com'
        });
    }

    @IsTest
    static void newProspectHasNoMatches() {
        VisitingCardData card = VisitingCardData.fromMap(new Map<String, Object>{
            'firstName' => 'John', 'lastName' => 'Smith', 'company' => 'ABC Foods International', 'email' => 'john.smith@abcfoods.com', 'phone' => '+1 415 555 0100'
        });
        LeadDuplicateCheckService.Result r = LeadDuplicateCheckService.check(card);
        System.assertEquals(false, r.hasMatches);
        System.assertEquals(0, r.leads.size());
        System.assertEquals(0, r.contacts.size());
        System.assertEquals(0, r.accounts.size());
        System.assertEquals(0, r.confidence);
    }

    @IsTest
    static void existingContactAndAccountAreFoundWithHighConfidence() {
        LeadDuplicateCheckService.Result r = LeadDuplicateCheckService.check(ameen());
        System.assertEquals(true, r.hasMatches);
        System.assertEquals(1, r.contacts.size(), 'Contact matched by email/phone');
        System.assertEquals(1, r.accounts.size(), 'Account matched by company/website/phone');
        System.assertEquals(0, r.leads.size());
        LeadDuplicateCheckService.Match c = r.contacts[0];
        System.assertEquals('Ameen Azeez', c.name);
        System.assert(c.matchedFields.contains('Email'), c.matchedFields);
        System.assert(c.matchedFields.contains('Phone'), c.matchedFields);
        System.assert(c.matchedFields.contains('Name'), c.matchedFields);
        System.assert(c.matchedFields.contains('Company'), c.matchedFields);
        System.assert(c.confidence >= 90, 'confidence ' + c.confidence);
        LeadDuplicateCheckService.Match a = r.accounts[0];
        System.assertEquals('Fingertip', a.name);
        System.assert(a.matchedFields.contains('Company'));
        System.assert(a.matchedFields.contains('Website'));
        System.assert(a.matchedFields.contains('Phone'));
        System.assertEquals('Contact', r.bestMatch.objectType);
        System.assert(r.confidence >= 90);
    }

    @IsTest
    static void emailAloneMatchesExistingLead() {
        VisitingCardData card = VisitingCardData.fromMap(new Map<String, Object>{ 'firstName' => 'P', 'lastName' => 'N', 'company' => 'Other Co', 'email' => 'PRIYA@bloomorganics.example.com' });
        LeadDuplicateCheckService.Result r = LeadDuplicateCheckService.check(card);
        System.assertEquals(1, r.leads.size());
        System.assertEquals(new List<String>{ 'Email' }, r.leads[0].matchedFields);
        System.assert(r.leads[0].confidence >= 70 && r.leads[0].confidence < 90, 'single strong signal: ' + r.leads[0].confidence);
    }

    @IsTest
    static void phoneAloneMatchesWithLowerConfidence() {
        VisitingCardData card = VisitingCardData.fromMap(new Map<String, Object>{ 'firstName' => 'A', 'lastName' => 'Z', 'company' => 'Other Co', 'mobile' => '+91 94950 72255' });
        LeadDuplicateCheckService.Result r = LeadDuplicateCheckService.check(card);
        System.assertEquals(1, r.contacts.size());
        System.assertEquals(new List<String>{ 'Phone' }, r.contacts[0].matchedFields);
        System.assert(r.contacts[0].confidence < 70, 'phone only: ' + r.contacts[0].confidence);
    }

    @IsTest
    static void companyAloneMatchesAccount() {
        VisitingCardData card = VisitingCardData.fromMap(new Map<String, Object>{ 'firstName' => 'New', 'lastName' => 'Person', 'company' => 'Fingertip' });
        LeadDuplicateCheckService.Result r = LeadDuplicateCheckService.check(card);
        System.assertEquals(1, r.accounts.size());
        System.assertEquals(new List<String>{ 'Company' }, r.accounts[0].matchedFields);
        System.assertEquals(0, r.contacts.size(), 'contact needs email/phone/domain to be a candidate');
    }

    @IsTest
    static void emptyCardIsSafe() {
        LeadDuplicateCheckService.Result r = LeadDuplicateCheckService.check(new VisitingCardData());
        System.assertEquals(false, r.hasMatches);
        System.assertEquals(false, LeadDuplicateCheckService.check(null).hasMatches);
    }

    @IsTest
    static void scoreIsMonotonicAndCapped() {
        Integer one = LeadDuplicateCheckService.score(new List<String>{ 'Phone' });
        Integer two = LeadDuplicateCheckService.score(new List<String>{ 'Email', 'Phone' });
        Integer four = LeadDuplicateCheckService.score(new List<String>{ 'Email', 'Phone', 'Name', 'Company' });
        System.assert(one < two && two < four);
        System.assert(four <= 99);
    }
}
