/**
 * Apex controller for the scanVisitingCard and leadQualification Lightning
 * web components. Orchestrates: extract -> (review in UI) -> duplicate check
 * -> create Lead. No Lead is created until createLead is called explicitly.
 */
public with sharing class VisitingCardController {
    public static final String SCAN_SOURCE_CARD = 'Visiting Card Scan';
    public static final String SCAN_SOURCE_MANUAL = 'Manual Entry';

    public class LeadCreateResult {
        @AuraEnabled public Id leadId { get; set; }
        @AuraEnabled public String name { get; set; }
        @AuraEnabled public String company { get; set; }
        @AuraEnabled public String status { get; set; }
        @AuraEnabled public String leadSource { get; set; }
    }

    /** Step 2: OCR / card extraction through the configured provider. Never throws. */
    @AuraEnabled
    public static VisitingCardOcrResult extractCard(String imageBase64, String contentType, String fileName) {
        return VisitingCardOcrService.extract(imageBase64, contentType, fileName);
    }

    /** Step 4: duplicate check on email, phone and company (plus name / domain as supporting signals). */
    @AuraEnabled
    public static LeadDuplicateCheckService.Result checkDuplicates(Map<String, Object> card) {
        try {
            return LeadDuplicateCheckService.check(VisitingCardData.fromMap(card));
        } catch (Exception e) {
            throw new AuraHandledException('Duplicate check failed: ' + e.getMessage());
        }
    }

    /**
     * Step 5: create the Lead from the confirmed card data.
     * @param card          Reviewed fields from the component.
     * @param scanStatus    Extracted | Partially Extracted | Manual Entry | Failed (audit).
     * @param scanProvider  OCR engine name (audit).
     * @param scannedAt     When the card was captured (audit); null = now.
     */
    @AuraEnabled
    public static LeadCreateResult createLead(Map<String, Object> card, String scanStatus, String scanProvider, Datetime scannedAt) {
        VisitingCardData d = VisitingCardData.fromMap(card);
        if (!d.hasName()) {
            throw new AuraHandledException('A first or last name is required to create a Lead.');
        }
        if (String.isBlank(d.company)) {
            throw new AuraHandledException('Company is required to create a Lead.');
        }
        if (!Schema.sObjectType.Lead.isCreateable()) {
            throw new AuraHandledException('You do not have permission to create Leads.');
        }

        Lead l = new Lead();
        l.FirstName = d.firstName;
        l.LastName = String.isBlank(d.lastName) ? d.firstName : d.lastName;
        l.Title = d.title;
        l.Company = d.company;
        l.Email = d.email;
        l.Phone = d.phone;
        l.MobilePhone = d.mobile;
        l.Website = d.website;
        l.Country = d.country;
        l.LeadSource = String.isBlank(d.leadSource) ? LeadQualificationHandler.LEAD_SOURCE_TRADE_SHOW : d.leadSource;
        l.Event_Name__c = d.eventName;
        l.Status = 'Open - Not Contacted';
        l.Scan_Source__c = scanStatus == 'Manual Entry' ? SCAN_SOURCE_MANUAL : SCAN_SOURCE_CARD;
        l.Scan_Status__c = String.isBlank(scanStatus) ? 'Extracted' : scanStatus;
        l.Scan_Provider__c = scanProvider == null ? null : scanProvider.left(80);
        l.Scan_Time__c = scannedAt == null ? Datetime.now() : scannedAt;

        try {
            insert l;
        } catch (DmlException e) {
            throw new AuraHandledException('Salesforce could not create the Lead: ' + e.getDmlMessage(0));
        }

        LeadCreateResult r = new LeadCreateResult();
        r.leadId = l.Id;
        r.name = (String.isBlank(l.FirstName) ? '' : l.FirstName + ' ') + l.LastName;
        r.company = l.Company;
        r.status = l.Status;
        r.leadSource = l.LeadSource;
        return r;
    }

    /** Exit-condition checklist for the qualification component. */
    @AuraEnabled(cacheable=true)
    public static Map<String, Boolean> getHandoffChecklist(Id leadId) {
        Lead l = [SELECT Id, Email, Phone, MobilePhone, LeadSource, Interested_Product__c, Purchase_Timeline__c, Expected_Annual_Volume__c,
                         Sample_Requested__c, Next_Action__c, Status, IsConverted
                  FROM Lead WHERE Id = :leadId WITH USER_MODE LIMIT 1];
        return new Map<String, Boolean>{
            'leadExists' => true,
            'contactDetails' => String.isNotBlank(l.Email) || String.isNotBlank(l.Phone) || String.isNotBlank(l.MobilePhone),
            'leadSource' => String.isNotBlank(l.LeadSource),
            'productInterest' => String.isNotBlank(l.Interested_Product__c),
            'requirementTimeline' => String.isNotBlank(l.Purchase_Timeline__c) || l.Expected_Annual_Volume__c != null,
            'sampleRequested' => l.Sample_Requested__c == true,
            'nextAction' => l.Next_Action__c == LeadQualificationHandler.NEXT_ACTION_SAMPLE,
            'statusReady' => l.Status == LeadQualificationHandler.STATUS_READY,
            'ready' => LeadQualificationHandler.isReadyForSample(l)
        };
    }
}
