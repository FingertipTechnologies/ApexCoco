/**
 * Single Lead trigger for Workstream 1. Delegates to LeadQualificationHandler.
 * Workstream 2 automation (Sample Request, Opportunity) must not be added here
 * without coordination - see README.
 */
trigger LeadTrigger on Lead (before insert, before update) {
    if (Trigger.isBefore && Trigger.isInsert) {
        LeadQualificationHandler.beforeInsert(Trigger.new);
    } else if (Trigger.isBefore && Trigger.isUpdate) {
        LeadQualificationHandler.beforeUpdate(Trigger.new, Trigger.oldMap);
    }
}
