import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue, notifyRecordUpdateAvailable } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import getHandoffChecklist from '@salesforce/apex/VisitingCardController.getHandoffChecklist';

import STATUS from '@salesforce/schema/Lead.Status';
import LEAD_SCORE from '@salesforce/schema/Lead.Lead_Score__c';
import NEXT_ACTION from '@salesforce/schema/Lead.Next_Action__c';
import SAMPLE_REQUESTED from '@salesforce/schema/Lead.Sample_Requested__c';

const ENRICHMENT_FIELDS = ['Website', 'Email', 'Phone', 'MobilePhone', 'Country', 'LeadSource', 'Event_Name__c', 'Customer_Type__c'];
const QUALIFICATION_FIELDS = ['Interested_Product__c', 'Expected_Annual_Volume__c', 'Volume_Unit__c', 'Purchase_Timeline__c', 'Current_Supplier__c', 'Competitor__c', 'Potential_Rating__c', 'Next_Follow_up_Date__c', 'Qualification_Notes__c'];
const HANDOFF_FIELDS = ['Sample_Requested__c', 'Sample_Request_Date__c', 'Next_Action__c'];

const CHECKLIST = [
    { key: 'leadExists', label: 'Lead exists' },
    { key: 'contactDetails', label: 'Contact details validated (email or phone)' },
    { key: 'leadSource', label: 'Lead Source captured' },
    { key: 'productInterest', label: 'Product interest captured' },
    { key: 'requirementTimeline', label: 'Requirement / timeline captured' },
    { key: 'sampleRequested', label: 'Sample Requested = Yes' },
    { key: 'nextAction', label: 'Next Action = Create Sample Request' },
    { key: 'statusReady', label: 'Status = Qualified / Ready for Sample' }
];

/**
 * Enrich Lead -> Qualify Lead -> Sample Request Ready (handoff to Workstream 2).
 * Uses lightning-record-edit-form so field-level security and picklists come
 * from the org; LeadQualificationHandler (trigger) computes Lead Score and
 * flips Status when the exit condition is met.
 */
export default class LeadQualification extends LightningElement {
    @api recordId;

    enrichmentFields = ENRICHMENT_FIELDS;
    qualificationFields = QUALIFICATION_FIELDS;
    handoffFields = HANDOFF_FIELDS;

    saving = false;
    section = 'all';
    wiredChecklist;
    checklist = {};

    @wire(getRecord, { recordId: '$recordId', fields: [STATUS, LEAD_SCORE, NEXT_ACTION, SAMPLE_REQUESTED] })
    lead;

    @wire(getHandoffChecklist, { leadId: '$recordId' })
    wiredList(result) {
        this.wiredChecklist = result;
        if (result.data) this.checklist = result.data;
    }

    get status() { return getFieldValue(this.lead.data, STATUS); }
    get leadScore() { const v = getFieldValue(this.lead.data, LEAD_SCORE); return v === undefined || v === null ? 0 : v; }
    get scoreStyle() { return `width: ${Math.max(0, Math.min(100, this.leadScore))}%`; }
    get isReady() { return Boolean(this.checklist.ready) && this.status === 'Qualified / Ready for Sample'; }
    get statusBadgeClass() { return this.isReady ? 'slds-badge slds-theme_success' : 'slds-badge'; }
    get rows() {
        return CHECKLIST.map((c) => {
            const ok = Boolean(this.checklist[c.key]);
            return { ...c, ok, icon: ok ? 'utility:check' : 'utility:dash', cls: ok ? 'check-row check-ok' : 'check-row', iconCls: ok ? 'check-icon check-icon_ok' : 'check-icon' };
        });
    }
    get completedCount() { return this.rows.filter((r) => r.ok).length; }
    get progressLabel() { return `${this.completedCount} of ${CHECKLIST.length} handoff conditions met`; }

    handleSubmit() { this.saving = true; }

    handleSuccess() {
        this.saving = false;
        this.refresh('Lead updated', 'Qualification details saved.');
    }

    handleError(event) {
        this.saving = false;
        const detail = event.detail || {};
        this.dispatchEvent(new ShowToastEvent({ title: 'Could not save', message: detail.detail || detail.message || 'Check the highlighted fields.', variant: 'error' }));
    }

    /** One-tap handoff: Sample Requested = Yes, Next Action = Create Sample Request; the trigger sets Status when the exit condition holds. */
    handleMarkReady() {
        const form = this.template.querySelector('lightning-record-edit-form.handoff-form');
        const sample = this.template.querySelector('lightning-input-field[data-field="Sample_Requested__c"]');
        const action = this.template.querySelector('lightning-input-field[data-field="Next_Action__c"]');
        if (sample) sample.value = true;
        if (action) action.value = 'Create Sample Request';
        if (form) form.submit();
    }

    async refresh(title, message) {
        await notifyRecordUpdateAvailable([{ recordId: this.recordId }]);
        if (this.wiredChecklist) await refreshApex(this.wiredChecklist);
        if (title) this.dispatchEvent(new ShowToastEvent({ title, message, variant: 'success' }));
    }
}
