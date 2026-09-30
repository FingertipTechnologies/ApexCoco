/**
 * Apex Coco - verifies the Lead management enhancements in the org (Rating Indicator, Lead Aging, Next Follow-up Date).
 * Creates three throw-away leads, asserts the formulas and deletes them again. Fails loudly (System.assert) on any mismatch.
 *
 *   sf apex run --file scripts/apex/verifyLeadManagement.apex --target-org <alias>
 */
List<Lead> probes = new List<Lead>{
    new Lead(LastName = 'Verify Hot', Company = 'APEX VERIFY', Rating = 'Hot', Next_Followup_Date__c = Date.today()),
    new Lead(LastName = 'Verify Warm', Company = 'APEX VERIFY', Rating = 'Warm', Next_Followup_Date__c = Date.today()),
    new Lead(LastName = 'Verify Cold', Company = 'APEX VERIFY', Rating = 'Cold'),
    new Lead(LastName = 'Verify None', Company = 'APEX VERIFY')
};
insert probes;
try {
    Map<String, String> expectedImage = new Map<String, String>{ 'Hot' => 'red.png', 'Warm' => 'amber.png', 'Cold' => 'green.png' };
    for (Lead l : [SELECT Rating, Rating_Indicator__c, Lead_Aging__c, CreatedDate FROM Lead WHERE Id IN :probes]) {
        if (l.Rating == null) {
            System.assert(String.isBlank(l.Rating_Indicator__c), 'No rating must give an empty indicator, got: ' + l.Rating_Indicator__c);
        } else {
            System.assert(l.Rating_Indicator__c != null && l.Rating_Indicator__c.contains('/resource/Apex_Rating_Indicators/' + expectedImage.get(l.Rating)),
                'Rating ' + l.Rating + ' must render ' + expectedImage.get(l.Rating) + ', got: ' + l.Rating_Indicator__c);
        }
        System.assertEquals(0, l.Lead_Aging__c, 'Lead created today must have Lead Aging 0');
    }
    Integer actionToday = [SELECT COUNT() FROM Lead WHERE Company = 'APEX VERIFY' AND Next_Followup_Date__c = TODAY];
    System.assertEquals(2, actionToday, 'Action Today filter (Next Follow-up Date = TODAY) must match the two probes');
    Integer thisWeek = [SELECT COUNT() FROM Lead WHERE Company = 'APEX VERIFY' AND Next_Followup_Date__c = THIS_WEEK];
    System.assertEquals(2, thisWeek, 'This Week Closing filter (Next Follow-up Date = THIS_WEEK) must match the two probes');
    List<ListView> views = [SELECT DeveloperName FROM ListView WHERE SobjectType = 'Lead' AND DeveloperName IN ('Apex_All_Leads', 'Apex_Hot_Leads', 'Apex_Warm_Leads', 'Apex_Cold_Leads', 'Apex_Action_Today', 'Apex_This_Week_Closing')];
    System.assertEquals(6, views.size(), 'All six Apex Lead list views must be deployed, found ' + views.size());
    System.debug('LEAD MANAGEMENT VERIFICATION PASSED: indicators, aging, follow-up filters and the 6 list views are correct.');
} finally {
    delete probes;
}
