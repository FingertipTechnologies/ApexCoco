/**
 * Apex Coco - Person 2 (Sample -> Opportunity -> Order)
 *
 * Invocable service used by the screen flow Apex_Lead_Request_Sample.
 * Converts the qualified Lead delivered by Person 1 into Account + Contact WITHOUT creating the
 * standard Opportunity. The flow then finds or creates the Apex Opportunity (Stage = Sample Requested)
 * and Sample Request #1. If an Account with the same name already exists the lead is attached to it
 * ("existing customer relationship found") instead of creating a duplicate customer.
 *
 * Apex is used only because Flow has no native "Convert Lead" action.
 */
public with sharing class LeadSampleConversionService {

    public class Request {
        @InvocableVariable(label='Lead Id' required=true)
        public Id leadId;
    }

    public class Result {
        @InvocableVariable(label='Account Id')
        public Id accountId;
        @InvocableVariable(label='Contact Id')
        public Id contactId;
        @InvocableVariable(label='Was Already Converted')
        public Boolean wasAlreadyConverted;
        @InvocableVariable(label='Matched Existing Account')
        public Boolean matchedExistingAccount;
        @InvocableVariable(label='Message')
        public String message;
    }

    @InvocableMethod(label='Apex: Convert Lead for Sample Request' description='Converts a qualified Lead to Account and Contact (no Opportunity) so the Sample-to-Order flow can create the Apex opportunity.' category='Apex Coco')
    public static List<Result> convertLeads(List<Request> requests) {
        List<Result> results = new List<Result>();
        for (Request req : requests) {
            results.add(convertOne(req.leadId));
        }
        return results;
    }

    private static Result convertOne(Id leadId) {
        Result res = new Result();
        res.wasAlreadyConverted = false;
        res.matchedExistingAccount = false;

        Lead ld = [SELECT Id, Company, Email, IsConverted, ConvertedAccountId, ConvertedContactId
                   FROM Lead WHERE Id = :leadId LIMIT 1];

        if (ld.IsConverted) {
            res.accountId = ld.ConvertedAccountId;
            res.contactId = ld.ConvertedContactId;
            res.wasAlreadyConverted = true;
            res.message = 'Lead was already converted. Existing Account and Contact reused.';
            return res;
        }

        Database.LeadConvert lc = new Database.LeadConvert();
        lc.setLeadId(ld.Id);
        lc.setDoNotCreateOpportunity(true);
        lc.setConvertedStatus(getConvertedStatus());

        // Duplicate prevention: attach to an existing customer with the same company name.
        if (String.isNotBlank(ld.Company)) {
            List<Account> existing = [SELECT Id FROM Account WHERE Name = :ld.Company ORDER BY CreatedDate ASC LIMIT 1];
            if (!existing.isEmpty()) {
                lc.setAccountId(existing[0].Id);
                res.matchedExistingAccount = true;
                if (String.isNotBlank(ld.Email)) {
                    List<Contact> existingContacts = [SELECT Id FROM Contact WHERE AccountId = :existing[0].Id AND Email = :ld.Email LIMIT 1];
                    if (!existingContacts.isEmpty()) {
                        lc.setContactId(existingContacts[0].Id);
                    }
                }
            }
        }

        Database.LeadConvertResult lcr = Database.convertLead(lc, false);
        if (!lcr.isSuccess()) {
            String err = '';
            for (Database.Error e : lcr.getErrors()) {
                err += e.getMessage() + ' ';
            }
            throw new LeadSampleConversionException('Lead conversion failed: ' + err.trim());
        }
        res.accountId = lcr.getAccountId();
        res.contactId = lcr.getContactId();
        res.message = res.matchedExistingAccount
            ? 'Existing customer relationship found. Lead attached to the existing Account.'
            : 'Lead converted to a new Account and Contact.';
        return res;
    }

    private static String getConvertedStatus() {
        List<LeadStatus> statuses = [SELECT MasterLabel FROM LeadStatus WHERE IsConverted = true ORDER BY SortOrder ASC LIMIT 1];
        if (statuses.isEmpty()) {
            throw new LeadSampleConversionException('No converted Lead Status is defined in this org.');
        }
        return statuses[0].MasterLabel;
    }

    public class LeadSampleConversionException extends Exception {}
}
