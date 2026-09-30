import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { loadScript } from 'lightning/platformResourceLoader';
import JSQR from '@salesforce/resourceUrl/jsQR';
import extractCard from '@salesforce/apex/VisitingCardController.extractCard';
import checkDuplicates from '@salesforce/apex/VisitingCardController.checkDuplicates';
import createLead from '@salesforce/apex/VisitingCardController.createLead';
import { parseCardText, parseQrPayload, mergeLayers, scanStatusFor, compact } from 'c/visitingCardParser';

const LEAD_SOURCE_DEFAULT = 'Trade Show / Exhibition';
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_DIMENSION = 1800; // px - images are downscaled before upload to keep callouts fast

const STEPS = [
    { label: 'Scan', value: 'capture' },
    { label: 'Extract', value: 'extracting' },
    { label: 'Review', value: 'review' },
    { label: 'Check', value: 'checking' },
    { label: 'Create', value: 'result' },
    { label: 'Done', value: 'complete' }
];

const REVIEW_FIELDS = [
    { name: 'firstName', label: 'First Name', type: 'text', autocomplete: 'given-name' },
    { name: 'lastName', label: 'Last Name', type: 'text', autocomplete: 'family-name', required: true },
    { name: 'title', label: 'Title', type: 'text', autocomplete: 'organization-title' },
    { name: 'company', label: 'Company', type: 'text', autocomplete: 'organization', required: true },
    { name: 'email', label: 'Email', type: 'email', autocomplete: 'email' },
    { name: 'phone', label: 'Phone', type: 'tel', autocomplete: 'tel' },
    { name: 'mobile', label: 'Mobile', type: 'tel', autocomplete: 'tel' },
    { name: 'website', label: 'Website', type: 'text', autocomplete: 'url' },
    { name: 'country', label: 'Country', type: 'text', autocomplete: 'country-name' },
    { name: 'eventName', label: 'Event Name', type: 'text', placeholder: 'e.g. Gulfood 2026' }
];

/**
 * Scan Visiting Card - Workstream 1 mobile experience.
 *
 * capture -> extracting (QR on device + OCR adapter via Apex) -> review & correct
 * -> duplicate check -> create Lead | open existing record -> qualify.
 * Nothing is written to Salesforce until the salesperson taps Create Lead.
 */
export default class ScanVisitingCard extends NavigationMixin(LightningElement) {
    /** Set automatically when used as a Lead quick action; not required. */
    @api recordId;

    stage = 'capture';
    steps = STEPS;

    // capture
    file;
    previewUrl;
    captureError;
    scannedAt;

    // extracting
    extractRows = [];
    extraction; // { rawText, provider, confidence, qr, warnings }

    // review
    contact = {};
    sources = {};
    editing = false;
    fieldErrors = {};
    manualEntry = false;
    showDetails = false;

    // duplicate check
    checkError;
    duplicates; // LeadDuplicateCheckService.Result
    creating = false;
    createError;
    createAnyway = false;

    // complete
    createdLead;

    jsQrReady = false;
    disconnectedFlag = false;

    connectedCallback() {
        loadScript(this, JSQR)
            .then(() => { this.jsQrReady = true; })
            .catch(() => { this.jsQrReady = false; });
    }

    disconnectedCallback() {
        this.disconnectedFlag = true;
        this.revokePreview();
    }

    renderedCallback() {
        // Opens the rear camera directly on phones; set here because the
        // template compiler does not recognise the attribute.
        const camera = this.template.querySelector('input.camera-input');
        if (camera && !camera.hasAttribute('capture')) camera.setAttribute('capture', 'environment');
    }

    // ---------------------------------------------------------------- getters
    get stageIndex() { return STEPS.findIndex((s) => s.value === this.stage); }
    get isCapture() { return this.stage === 'capture'; }
    get isExtracting() { return this.stage === 'extracting'; }
    get isReview() { return this.stage === 'review'; }
    get isChecking() { return this.stage === 'checking'; }
    get isResult() { return this.stage === 'result'; }
    get isComplete() { return this.stage === 'complete'; }
    get hasPreview() { return Boolean(this.previewUrl); }
    get fileLabel() { return this.file ? `${this.file.name} · ${Math.round(this.file.size / 1024)} KB` : ''; }
    get editLabel() { return this.editing ? 'Done Editing' : 'Edit Information'; }
    get editIcon() { return this.editing ? 'utility:check' : 'utility:edit'; }
    get editVariant() { return this.editing ? 'success' : 'neutral'; }
    get reviewTitle() { return this.manualEntry ? 'Enter Lead Details' : 'Review Extracted Information'; }
    get hasWarnings() { return Boolean(this.extraction && this.extraction.warnings && this.extraction.warnings.length); }
    get hasFieldErrors() { return Object.keys(this.fieldErrors).length > 0; }
    get detailsIcon() { return this.showDetails ? 'utility:chevronup' : 'utility:chevrondown'; }
    get detailsExpanded() { return this.showDetails ? 'true' : 'false'; }
    get qrSummary() {
        if (!this.extraction || !this.extraction.qr) return 'No QR code found on this card';
        return `QR code decoded (${this.extraction.qr.format})`;
    }
    get providerSummary() { return this.extraction ? this.extraction.provider : ''; }
    get confidenceSummary() {
        if (!this.extraction || this.extraction.confidence === undefined || this.extraction.confidence === null) return '';
        return `${Math.round(this.extraction.confidence)}% OCR confidence`;
    }
    get filledCount() { return Object.keys(compact(this.contact)).length; }
    get fullName() { return [this.contact.firstName, this.contact.lastName].filter(Boolean).join(' '); }
    get displayName() { return this.fullName || 'this contact'; }

    get reviewFields() {
        return REVIEW_FIELDS.map((f) => {
            const value = this.contact[f.name] || '';
            const source = this.sources[f.name];
            return {
                ...f,
                value,
                displayValue: value || 'Not on card',
                valueClass: value ? 'slds-text-body_regular' : 'slds-text-color_weak slds-text-body_small',
                error: this.fieldErrors[f.name],
                badge: value && source ? { qr: 'QR', ocr: 'OCR', service: 'OCR', manual: 'Edited' }[source] : null,
                badgeClass: source === 'qr' ? 'slds-badge slds-theme_success' : source === 'manual' ? 'slds-badge slds-theme_warning' : 'slds-badge'
            };
        });
    }

    get leadSourceValue() { return this.contact.leadSource || LEAD_SOURCE_DEFAULT; }

    get isNewProspect() { return this.duplicates && !this.duplicates.hasMatches; }
    get isMatchFound() { return this.duplicates && this.duplicates.hasMatches; }
    get duplicateRows() {
        if (!this.duplicates) return [];
        const d = this.duplicates;
        return [
            { key: 'Lead', label: d.leads.length ? `${d.leads.length} matching Lead${d.leads.length > 1 ? 's' : ''} found` : 'No matching Lead found', icon: d.leads.length ? 'utility:warning' : 'utility:success', cls: d.leads.length ? 'row-warn' : 'row-ok' },
            { key: 'Contact', label: d.contacts.length ? `${d.contacts.length} matching Contact${d.contacts.length > 1 ? 's' : ''} found` : 'No matching Contact found', icon: d.contacts.length ? 'utility:warning' : 'utility:success', cls: d.contacts.length ? 'row-warn' : 'row-ok' },
            { key: 'Account', label: d.accounts.length ? `${d.accounts.length} matching Account${d.accounts.length > 1 ? 's' : ''} found` : 'No matching Account found', icon: d.accounts.length ? 'utility:warning' : 'utility:success', cls: d.accounts.length ? 'row-warn' : 'row-ok' }
        ];
    }
    get allMatches() {
        if (!this.duplicates) return [];
        const icon = { Account: 'standard:account', Contact: 'standard:contact', Lead: 'standard:lead' };
        return [...this.duplicates.accounts, ...this.duplicates.contacts, ...this.duplicates.leads].map((m) => ({
            ...m,
            key: m.recordId,
            icon: icon[m.objectType],
            heading: `Existing ${m.objectType}`,
            matched: m.matchedFields.join(' · '),
            confidenceLabel: `${m.confidence}% match`,
            badgeClass: m.confidence >= 80 ? 'slds-badge slds-theme_error' : m.confidence >= 50 ? 'slds-badge slds-theme_warning' : 'slds-badge'
        }));
    }
    get bestMatch() { return this.duplicates ? this.duplicates.bestMatch : null; }
    get confidenceStyle() { return `--confidence: ${this.duplicates ? this.duplicates.confidence : 0}`; }
    get checkRows() { return this.checkRowsState; }
    checkRowsState = [];

    // --------------------------------------------------------------- capture
    handleTakePhoto() { this.template.querySelector('input.camera-input').click(); }
    handleUpload() { this.template.querySelector('input.file-input').click(); }

    handleFileChange(event) {
        const file = event.target.files && event.target.files[0];
        event.target.value = '';
        this.acceptFile(file);
    }

    acceptFile(file) {
        this.captureError = null;
        if (!file) return;
        if (!/^image\/(jpeg|jpg|png|webp|heic|heif)$/i.test(file.type) && !/\.(jpe?g|png|webp|heic)$/i.test(file.name)) {
            this.captureError = 'Please choose a JPEG, PNG or WebP photo of the card.';
            return;
        }
        if (file.size > MAX_BYTES) {
            this.captureError = 'That image is over 8 MB. Please use a smaller photo.';
            return;
        }
        this.revokePreview();
        this.file = file;
        this.previewUrl = URL.createObjectURL(file);
        this.scannedAt = new Date();
    }

    handleRetake() {
        this.revokePreview();
        this.file = null;
        this.captureError = null;
    }

    handleManualEntry() {
        this.manualEntry = true;
        this.extraction = null;
        this.contact = { leadSource: LEAD_SOURCE_DEFAULT };
        this.sources = {};
        this.editing = true;
        this.fieldErrors = {};
        this.scannedAt = new Date();
        this.stage = 'review';
    }

    // ------------------------------------------------------------- extracting
    async handleProcess() {
        if (!this.file) return;
        this.stage = 'extracting';
        this.manualEntry = false;
        this.extractRows = [
            { key: 'prepare', label: 'Preparing image', state: 'running' },
            { key: 'qr', label: 'Detecting QR code', state: 'pending' },
            { key: 'ocr', label: 'Reading card text (OCR)', state: 'pending' },
            { key: 'structure', label: 'Structuring Lead data', state: 'pending' }
        ].map(withRowClasses);

        try {
            const { base64, contentType, canvas } = await this.prepareImage(this.file);
            this.setRow('prepare', 'done');

            // 1. QR code, decoded on the device.
            this.setRow('qr', 'running');
            const qr = this.decodeQr(canvas);
            this.setRow('qr', qr ? 'done' : 'warn', qr ? `QR code decoded (${qr.format})` : 'No QR code on this card');

            // 2. OCR through the configured provider (Apex adapter).
            this.setRow('ocr', 'running');
            const ocr = await extractCard({ imageBase64: base64, contentType, fileName: this.file.name });
            if (this.disconnectedFlag) return;
            const ocrOk = ocr && ocr.success;
            this.setRow('ocr', ocrOk ? (ocr.rawText || (ocr.fields && Object.keys(compact(ocr.fields)).length) ? 'done' : 'warn') : 'error', ocrOk ? ocr.provider : (ocr && ocr.errorMessage) || 'OCR failed');

            // 3. Structure: QR > service fields > rule-based parse of raw text.
            this.setRow('structure', 'running');
            const layers = [];
            if (qr && qr.contact) layers.push({ source: 'qr', contact: qr.contact });
            if (ocrOk && ocr.fields) layers.push({ source: 'service', contact: ocr.fields });
            if (ocrOk && ocr.rawText) layers.push({ source: 'ocr', contact: parseCardText(ocr.rawText).contact });
            const merged = mergeLayers(layers);
            this.setRow('structure', 'done', `${Object.keys(merged.contact).length} fields`);

            const warnings = [];
            if (ocrOk && ocr.warnings) warnings.push(...ocr.warnings);
            if (!ocrOk && ocr && ocr.errorMessage) warnings.push(ocr.errorMessage);
            if (!merged.contact.firstName && !merged.contact.lastName) warnings.push('The person\'s name could not be identified. Please complete it below.');

            this.extraction = {
                rawText: ocrOk ? ocr.rawText : '',
                provider: ocrOk ? ocr.provider : (ocr && ocr.provider) || 'none',
                confidence: ocrOk ? ocr.confidence : null,
                qr,
                warnings,
                ocrFailed: !ocrOk
            };
            this.contact = { ...merged.contact, leadSource: LEAD_SOURCE_DEFAULT };
            this.sources = merged.sources;
            this.fieldErrors = {};
            this.editing = Object.keys(merged.contact).length === 0; // nothing extracted -> straight into manual entry
            this.manualEntry = this.editing;
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => { if (!this.disconnectedFlag) this.stage = 'review'; }, 500);
        } catch (error) {
            this.setRow('prepare', 'error');
            this.extraction = { rawText: '', provider: 'none', qr: null, warnings: [reduceError(error)], ocrFailed: true };
            this.contact = { leadSource: LEAD_SOURCE_DEFAULT };
            this.sources = {};
            this.editing = true;
            this.manualEntry = true;
            this.stage = 'review';
            this.toast('Card could not be processed', reduceError(error), 'warning');
        }
    }

    setRow(key, state, detail) {
        this.extractRows = this.extractRows.map((r) => (r.key === key ? withRowClasses({ ...r, state, detail: detail || r.detail }) : r));
    }

    /** Downscales the photo on the device and returns base64 + a canvas for QR decoding. */
    prepareImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                try {
                    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.round(img.width * scale);
                    canvas.height = Math.round(img.height * scale);
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
                    URL.revokeObjectURL(url);
                    resolve({ base64: dataUrl.split(',')[1], contentType: 'image/jpeg', canvas });
                } catch (e) {
                    URL.revokeObjectURL(url);
                    reject(e);
                }
            };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('The image could not be read.')); };
            img.src = url;
        });
    }

    /** Tries jsQR at a few scales; returns { raw, format, contact } or null. */
    decodeQr(canvas) {
        if (!this.jsQrReady || typeof window.jsQR !== 'function') return null;
        const widths = [canvas.width, 1200, 800];
        for (const width of widths) {
            try {
                const scale = Math.min(1, width / canvas.width);
                const w = Math.max(1, Math.round(canvas.width * scale));
                const h = Math.max(1, Math.round(canvas.height * scale));
                const c = document.createElement('canvas');
                c.width = w;
                c.height = h;
                c.getContext('2d').drawImage(canvas, 0, 0, w, h);
                const data = c.getContext('2d').getImageData(0, 0, w, h);
                const found = window.jsQR(data.data, w, h, { inversionAttempts: 'attemptBoth' });
                if (found && found.data) {
                    const parsed = parseQrPayload(found.data);
                    return { raw: found.data, format: parsed.format, contact: parsed.contact };
                }
            } catch (e) {
                // try next scale
            }
        }
        return null;
    }

    // ----------------------------------------------------------------- review
    handleToggleEdit() {
        if (this.editing) this.validate();
        this.editing = !this.editing;
    }

    handleFieldChange(event) {
        const name = event.target.dataset.field;
        const value = event.target.value;
        this.contact = { ...this.contact, [name]: value };
        this.sources = { ...this.sources, [name]: 'manual' };
        if (this.fieldErrors[name]) {
            const next = { ...this.fieldErrors };
            delete next[name];
            this.fieldErrors = next;
        }
    }

    handleLeadSourceChange(event) {
        this.contact = { ...this.contact, leadSource: event.target.value };
    }

    handleToggleDetails() { this.showDetails = !this.showDetails; }

    validate() {
        const c = compact(this.contact);
        const errors = {};
        if (!c.firstName && !c.lastName) errors.lastName = 'Enter at least a first or last name.';
        if (!c.company) errors.company = 'Company is required to create a Lead.';
        if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email)) errors.email = 'Enter a valid email address.';
        if (c.mobile && c.mobile.replace(/\D/g, '').length < 7) errors.mobile = 'Enter a valid mobile number.';
        if (c.phone && c.phone.replace(/\D/g, '').length < 7) errors.phone = 'Enter a valid phone number.';
        this.fieldErrors = errors;
        return Object.keys(errors).length === 0;
    }

    async handleConfirm() {
        if (!this.validate()) {
            this.editing = true;
            return;
        }
        this.editing = false;
        this.contact = { ...compact(this.contact), leadSource: this.leadSourceValue };
        await this.runDuplicateCheck();
    }

    handleRescan() { this.reset(); }

    // -------------------------------------------------------- duplicate check
    async runDuplicateCheck() {
        this.stage = 'checking';
        this.checkError = null;
        this.duplicates = null;
        this.createAnyway = false;
        this.checkRowsState = [
            { key: 'Lead', label: 'Checking Leads...', state: 'running' },
            { key: 'Contact', label: 'Check Contacts', state: 'pending' },
            { key: 'Account', label: 'Check Accounts', state: 'pending' }
        ].map(withRowClasses);
        try {
            const result = await checkDuplicates({ card: this.contact });
            if (this.disconnectedFlag) return;
            // Reveal the three checks one after another so the audience can follow.
            await this.reveal('Lead', result.leads.length);
            await this.reveal('Contact', result.contacts.length);
            await this.reveal('Account', result.accounts.length);
            this.duplicates = result;
            this.stage = 'result';
        } catch (error) {
            this.checkError = reduceError(error);
            this.checkRowsState = this.checkRowsState.map((r) => withRowClasses({ ...r, state: r.state === 'running' ? 'error' : r.state }));
        }
    }

    reveal(key, count) {
        const labels = { Lead: 'Leads', Contact: 'Contacts', Account: 'Accounts' };
        return new Promise((resolve) => {
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => {
                this.checkRowsState = this.checkRowsState.map((r) => {
                    if (r.key === key) return withRowClasses({ ...r, state: count ? 'warn' : 'done', label: count ? `${count} possible ${count === 1 ? key : labels[key]} match${count === 1 ? '' : 'es'} found` : `No matching ${key} found` });
                    if (r.state === 'pending') return withRowClasses({ ...r, state: 'running', label: `Checking ${labels[r.key]}...` });
                    return r;
                });
                resolve();
            }, 450);
        });
    }

    handleRetryCheck() { this.runDuplicateCheck(); }
    handleBackToReview() { this.stage = 'review'; }

    // ----------------------------------------------------------------- result
    async handleCreateLead() {
        this.creating = true;
        this.createError = null;
        try {
            const scanStatus = this.manualEntry ? 'Manual Entry' : scanStatusFor(this.contact);
            const result = await createLead({
                card: this.contact,
                scanStatus,
                scanProvider: this.extraction ? this.extraction.provider : null,
                scannedAt: this.scannedAt ? this.scannedAt.toISOString() : null
            });
            this.createdLead = result;
            this.stage = 'complete';
            this.toast('Lead created', `${result.name} · ${result.company}`, 'success');
        } catch (error) {
            this.createError = reduceError(error);
        } finally {
            this.creating = false;
        }
    }

    handleCreateAnyway() { this.createAnyway = true; }
    handleCancelAnyway() { this.createAnyway = false; }

    handleOpenRecord(event) {
        const recordId = event.currentTarget.dataset.id || (this.bestMatch && this.bestMatch.recordId);
        if (recordId) this.navigateToRecord(recordId);
    }

    handleOpenLead() { if (this.createdLead) this.navigateToRecord(this.createdLead.leadId); }
    handleScanAnother() { this.reset(); }

    navigateToRecord(recordId) {
        this[NavigationMixin.Navigate]({ type: 'standard__recordPage', attributes: { recordId, actionName: 'view' } });
    }

    // ---------------------------------------------------------------- helpers
    reset() {
        this.revokePreview();
        this.stage = 'capture';
        this.file = null;
        this.captureError = null;
        this.extraction = null;
        this.contact = {};
        this.sources = {};
        this.editing = false;
        this.fieldErrors = {};
        this.manualEntry = false;
        this.showDetails = false;
        this.duplicates = null;
        this.checkError = null;
        this.createError = null;
        this.createAnyway = false;
        this.createdLead = null;
        this.scannedAt = null;
    }

    revokePreview() {
        if (this.previewUrl) {
            URL.revokeObjectURL(this.previewUrl);
            this.previewUrl = null;
        }
    }

    toast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}

function withRowClasses(row) {
    const icons = { pending: 'utility:dash', running: 'utility:spinner', done: 'utility:check', warn: 'utility:check', error: 'utility:close' };
    return { ...row, icon: icons[row.state] || 'utility:dash', cls: `status-row status-${row.state}`, iconCls: `status-icon status-icon_${row.state}`, isRunning: row.state === 'running' };
}

function reduceError(error) {
    if (!error) return 'Unknown error';
    if (typeof error === 'string') return error;
    if (error.body && error.body.message) return error.body.message;
    if (error.message) return error.message;
    return 'Unexpected error';
}
