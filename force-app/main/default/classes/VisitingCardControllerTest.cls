@IsTest
private class VisitingCardControllerTest {
    private static Map<String, Object> ameenCard() {
        return new Map<String, Object>{
            'firstName' => 'Ameen', 'lastName' => 'Azeez', 'jobTitle' => 'Chief Revenue Officer', 'company' => 'Fingertip',
            'mobile' => '9495072255', 'email' => 'ameen@fingertipplus.com', 'website' => 'https://www.fingertipplus.com',
            'country' => 'India', 'eventName' => 'Gulfood 2026'
        };
    }

    @IsTest
    static void extractDelegatesToService() {
        VisitingCardOcrService.providerOverride = new VisitingCardMockOcrProvider();
        VisitingCardOcrResult r = VisitingCardController.extractCard('aGVsbG8=', 'image/jpeg', 'card.jpg');
        System.assertEquals(true, r.success);
        System.assertEquals('Mock (no OCR)', r.provider);
    }

    @IsTest
    static void createLeadMapsAllCardFieldsAndAudit() {
        Datetime scannedAt = Datetime.now().addMinutes(-2);
        Test.startTest();
        VisitingCardController.LeadCreateResult r = VisitingCardController.createLead(ameenCard(), 'Extracted', 'tesseract.js via Visiting_Card_OCR', scannedAt);
        Test.stopTest();
        System.assertNotEquals(null, r.leadId);
        System.assertEquals('Ameen Azeez', r.name);
        System.assertEquals('Fingertip', r.company);
        System.assertEquals('Open - Not Contacted', r.status);
        System.assertEquals('Trade Show / Exhibition', r.leadSource, 'Lead Source defaults to Trade Show / Exhibition');

        Lead l = [SELECT FirstName, LastName, Title, Company, Email, MobilePhone, Website, Country, LeadSource, Event_Name__c,
                         Scan_Source__c, Scan_Status__c, Scan_Provider__c, Scan_Time__c, Lead_Score__c FROM Lead WHERE Id = :r.leadId];
        System.assertEquals('Chief Revenue Officer', l.Title);
        System.assertEquals('ameen@fingertipplus.com', l.Email);
        System.assertEquals('9495072255', l.MobilePhone);
        System.assertEquals('https://www.fingertipplus.com', l.Website);
        System.assertEquals('India', l.Country);
        System.assertEquals('Gulfood 2026', l.Event_Name__c);
        System.assertEquals('Visiting Card Scan', l.Scan_Source__c);
        System.assertEquals('Extracted', l.Scan_Status__c);
        System.assertEquals('tesseract.js via Visiting_Card_OCR', l.Scan_Provider__c);
        System.assertEquals(scannedAt, l.Scan_Time__c);
        System.assertEquals(10, l.Lead_Score__c, 'email + phone contact completeness');
    }

    @IsTest
    static void manualEntryIsAuditedAsSuch() {
        VisitingCardController.LeadCreateResult r = VisitingCardController.createLead(new Map<String, Object>{ 'lastName' => 'Smith', 'company' => 'ABC Foods International', 'leadSource' => 'Trade Show / Exhibition' }, 'Manual Entry', null, null);
        Lead l = [SELECT FirstName, LastName, Scan_Source__c, Scan_Status__c, Scan_Time__c FROM Lead WHERE Id = :r.leadId];
        System.assertEquals('Manual Entry', l.Scan_Source__c);
        System.assertEquals('Manual Entry', l.Scan_Status__c);
        System.assertNotEquals(null, l.Scan_Time__c);
        System.assertEquals('Smith', l.LastName);
    }

    @IsTest
    static void firstNameOnlyBecomesLastName() {
        VisitingCardController.LeadCreateResult r = VisitingCardController.createLead(new Map<String, Object>{ 'firstName' => 'Madonna', 'company' => 'Solo Ltd' }, null, null, null);
        Lead l = [SELECT FirstName, LastName FROM Lead WHERE Id = :r.leadId];
        System.assertEquals('Madonna', l.LastName);
    }

    @IsTest
    static void createLeadValidatesRequiredFields() {
        try {
            VisitingCardController.createLead(new Map<String, Object>{ 'company' => 'Fingertip' }, null, null, null);
            System.assert(false, 'expected exception');
        } catch (AuraHandledException e) {
            System.assert(true);
        }
        try {
            VisitingCardController.createLead(new Map<String, Object>{ 'firstName' => 'Ameen' }, null, null, null);
            System.assert(false, 'expected exception');
        } catch (AuraHandledException e) {
            System.assert(true);
        }
        System.assertEquals(0, [SELECT COUNT() FROM Lead]);
    }

    @IsTest
    static void checkDuplicatesFindsSeededContact() {
        Account a = new Account(Name = 'Fingertip', Website = 'https://www.fingertipplus.com');
        insert a;
        insert new Contact(FirstName = 'Ameen', LastName = 'Azeez', Email = 'ameen@fingertipplus.com', AccountId = a.Id);
        LeadDuplicateCheckService.Result r = VisitingCardController.checkDuplicates(ameenCard());
        System.assertEquals(true, r.hasMatches);
        System.assertEquals(1, r.contacts.size());
        System.assertEquals(1, r.accounts.size());
    }

    @IsTest
    static void handoffChecklistReflectsExitCondition() {
        VisitingCardController.LeadCreateResult r = VisitingCardController.createLead(ameenCard(), 'Extracted', 'Mock', null);
        Map<String, Boolean> before = VisitingCardController.getHandoffChecklist(r.leadId);
        System.assertEquals(true, before.get('leadExists'));
        System.assertEquals(true, before.get('contactDetails'));
        System.assertEquals(true, before.get('leadSource'));
        System.assertEquals(false, before.get('productInterest'));
        System.assertEquals(false, before.get('ready'));

        update new Lead(Id = r.leadId, Interested_Product__c = 'Coconut Milk Powder', Purchase_Timeline__c = '3–6 Months', Sample_Requested__c = true, Next_Action__c = 'Create Sample Request');
        Map<String, Boolean> after = VisitingCardController.getHandoffChecklist(r.leadId);
        System.assertEquals(true, after.get('productInterest'));
        System.assertEquals(true, after.get('requirementTimeline'));
        System.assertEquals(true, after.get('sampleRequested'));
        System.assertEquals(true, after.get('nextAction'));
        System.assertEquals(true, after.get('statusReady'));
        System.assertEquals(true, after.get('ready'));
    }
}
