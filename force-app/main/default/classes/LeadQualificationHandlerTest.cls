@IsTest
private class LeadQualificationHandlerTest {
    private static Lead abcFoods() {
        return new Lead(FirstName = 'John', LastName = 'Smith', Title = 'Procurement Manager', Company = 'ABC Foods International',
            Email = 'john.smith@abcfoods.com', Phone = '+1 415 555 0100', Website = 'abcfoods.com', Country = 'USA',
            LeadSource = 'Trade Show / Exhibition', Event_Name__c = 'Gulfood 2026', Customer_Type__c = 'Importer',
            Interested_Product__c = 'Coconut Milk Powder', Expected_Annual_Volume__c = 500, Volume_Unit__c = 'MT',
            Purchase_Timeline__c = '3–6 Months', Current_Supplier__c = 'Competitor A', Competitor__c = 'Competitor A',
            Potential_Rating__c = 'High', Status = 'Open - Not Contacted');
    }

    @IsTest
    static void scoreIsCalculatedOnInsert() {
        Lead l = abcFoods();
        insert l;
        l = [SELECT Lead_Score__c, Status, Sample_Request_Date__c FROM Lead WHERE Id = :l.Id];
        // High 35 + 3–6 months 15 + volume>=500 20 + email 5 + phone 5 + product 5 = 85
        System.assertEquals(85, l.Lead_Score__c);
        System.assertEquals('Open - Not Contacted', l.Status, 'Not ready: no sample request / next action yet');
        System.assertEquals(null, l.Sample_Request_Date__c);
    }

    @IsTest
    static void handoffSetsStatusAndSampleDate() {
        Lead l = abcFoods();
        insert l;
        l.Sample_Requested__c = true;
        l.Next_Action__c = 'Create Sample Request';
        l.Qualification_Notes__c = 'Requires coconut milk powder';
        update l;
        l = [SELECT Lead_Score__c, Status, Sample_Request_Date__c, Next_Action__c FROM Lead WHERE Id = :l.Id];
        System.assertEquals(LeadQualificationHandler.STATUS_READY, l.Status);
        System.assertEquals(Date.today(), l.Sample_Request_Date__c);
        System.assertEquals(90, l.Lead_Score__c, 'sample requested adds 5');
        System.assertEquals('Create Sample Request', l.Next_Action__c);
    }

    @IsTest
    static void notReadyWithoutProductInterest() {
        Lead l = abcFoods();
        l.Interested_Product__c = null;
        l.Sample_Requested__c = true;
        l.Next_Action__c = 'Create Sample Request';
        insert l;
        l = [SELECT Status FROM Lead WHERE Id = :l.Id];
        System.assertEquals('Open - Not Contacted', l.Status);
    }

    @IsTest
    static void closedStatusIsNeverOverridden() {
        Lead l = abcFoods();
        l.Sample_Requested__c = true;
        l.Next_Action__c = 'Create Sample Request';
        l.Status = 'Closed - Not Converted';
        insert l;
        l = [SELECT Status FROM Lead WHERE Id = :l.Id];
        System.assertEquals('Closed - Not Converted', l.Status);
    }

    @IsTest
    static void scoreBands() {
        Lead low = new Lead(LastName = 'X', Company = 'Y', Potential_Rating__c = 'Low', Purchase_Timeline__c = '12+ Months', Expected_Annual_Volume__c = 10);
        System.assertEquals(16, LeadQualificationHandler.calculateScore(low));
        Lead max = new Lead(LastName = 'X', Company = 'Y', Email = 'a@b.co', Phone = '1', Potential_Rating__c = 'High', Purchase_Timeline__c = 'Immediate',
            Expected_Annual_Volume__c = 1000, Interested_Product__c = 'Coconut Water', Sample_Requested__c = true);
        System.assertEquals(100, LeadQualificationHandler.calculateScore(max));
        System.assertEquals(0, LeadQualificationHandler.calculateScore(new Lead(LastName = 'X', Company = 'Y')));
    }

    @IsTest
    static void bulkInsertIsSafe() {
        List<Lead> leads = new List<Lead>();
        for (Integer i = 0; i < 200; i++) {
            Lead l = abcFoods();
            l.Email = 'buyer' + i + '@abcfoods.com';
            l.Sample_Requested__c = true;
            l.Next_Action__c = 'Create Sample Request';
            leads.add(l);
        }
        Test.startTest();
        insert leads;
        Test.stopTest();
        System.assertEquals(200, [SELECT COUNT() FROM Lead WHERE Status = :LeadQualificationHandler.STATUS_READY]);
    }
}
