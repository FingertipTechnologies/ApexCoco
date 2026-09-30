/**
 * Lead qualification automation (Workstream 1).
 *
 * Runs before insert / before update from LeadTrigger:
 *  - calculates Lead_Score__c (0-100) from Potential Rating, Purchase Timeline,
 *    Expected Annual Volume and contact completeness;
 *  - defaults Sample_Request_Date__c to today when Sample Requested is ticked;
 *  - sets Status = "Qualified / Ready for Sample" when the Workstream 1 exit
 *    condition is met (see isReadyForSample), which is the handoff to Workstream 2.
 * It never touches converted leads and never lowers a status set by a user.
 */
public with sharing class LeadQualificationHandler {
    public static final String STATUS_READY = 'Qualified / Ready for Sample';
    public static final String NEXT_ACTION_SAMPLE = 'Create Sample Request';
    public static final String LEAD_SOURCE_TRADE_SHOW = 'Trade Show / Exhibition';

    public static void beforeInsert(List<Lead> leads) {
        for (Lead l : leads) {
            apply(l, null);
        }
    }

    public static void beforeUpdate(List<Lead> leads, Map<Id, Lead> oldMap) {
        for (Lead l : leads) {
            apply(l, oldMap == null ? null : oldMap.get(l.Id));
        }
    }

    @TestVisible
    private static void apply(Lead l, Lead old) {
        if (l.IsConverted == true) {
            return;
        }
        if (l.Sample_Requested__c == true && l.Sample_Request_Date__c == null) {
            l.Sample_Request_Date__c = Date.today();
        }
        l.Lead_Score__c = calculateScore(l);

        if (isReadyForSample(l) && l.Status != STATUS_READY && !isClosed(l.Status)) {
            l.Status = STATUS_READY;
        }
    }

    /**
     * Workstream 1 exit condition:
     * Lead exists + contact details validated + Lead Source captured + product interest captured
     * + requirement/timeline captured where available + Sample Requested = Yes + Next Action = Create Sample Request.
     */
    public static Boolean isReadyForSample(Lead l) {
        Boolean contactDetails = String.isNotBlank(l.Email) || String.isNotBlank(l.Phone) || String.isNotBlank(l.MobilePhone);
        return contactDetails
            && String.isNotBlank(l.LeadSource)
            && String.isNotBlank(l.Interested_Product__c)
            && l.Sample_Requested__c == true
            && l.Next_Action__c == NEXT_ACTION_SAMPLE;
    }

    /** Optional scoring field: 0-100. */
    public static Integer calculateScore(Lead l) {
        Integer score = 0;
        if (l.Potential_Rating__c == 'High') { score += 35; }
        else if (l.Potential_Rating__c == 'Medium') { score += 20; }
        else if (l.Potential_Rating__c == 'Low') { score += 8; }

        if (l.Purchase_Timeline__c == 'Immediate') { score += 25; }
        else if (l.Purchase_Timeline__c == '0–3 Months') { score += 20; }
        else if (l.Purchase_Timeline__c == '3–6 Months') { score += 15; }
        else if (l.Purchase_Timeline__c == '6–12 Months') { score += 8; }
        else if (l.Purchase_Timeline__c == '12+ Months') { score += 3; }

        if (l.Expected_Annual_Volume__c != null) {
            if (l.Expected_Annual_Volume__c >= 500) { score += 20; }
            else if (l.Expected_Annual_Volume__c >= 100) { score += 12; }
            else if (l.Expected_Annual_Volume__c > 0) { score += 5; }
        }

        if (String.isNotBlank(l.Email)) { score += 5; }
        if (String.isNotBlank(l.Phone) || String.isNotBlank(l.MobilePhone)) { score += 5; }
        if (String.isNotBlank(l.Interested_Product__c)) { score += 5; }
        if (l.Sample_Requested__c == true) { score += 5; }

        return Math.min(100, score);
    }

    private static Boolean isClosed(String status) {
        return status != null && status.startsWith('Closed');
    }
}
