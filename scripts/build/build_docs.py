#!/usr/bin/env python3
"""Regenerates docs/01-data-model.md from the deployed metadata."""
import os, glob
from xml.etree import ElementTree as ET
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
FA = f'{ROOT}/force-app/main/default'; SH = f'{ROOT}/shared-lead-contract/main/default'
NS = '{http://soap.sforce.com/2006/04/metadata}'
out = ['# 1. Data Model and Field Inventory (generated from metadata)', '',
'Objects, fields, API names, types and picklist values exactly as deployed. Regenerate with `python3 scripts/build/build_docs.py`.', '',
'## Object model', '', '```',
'Account 1 --< Contact',
'Account 1 --< Opportunity (Primary_Product__c > Product2)',
'Account 1 --< Sample_Request__c >-- 1 Opportunity     (Product__c > Product2, Contact__c > Contact, Lead__c > Lead)',
'Sample_Request__c 1 --< Sample_Request__c (Parent_Sample_Request__c: iteration chain)',
'Opportunity 1 --< Quote 1 --< QuoteLineItem (Account__c stamped by flow for price history)',
'Quote 1 --< Quote (Previous_Quote__c: version chain)',
'Opportunity 1 --< Competitor_Intel__c >-- 1 Account   (Product__c > Product2)',
'Opportunity 1 --< Customer_Onboarding__c >-- 1 Account',
'Opportunity 1 --< Order 1 --< OrderItem',
'Order 1 --< Integration_Log__c  (simulated SAP handoff audit trail)',
'Order 1 --< Case (Complaint_Product__c > Product2, Batch_Number__c)',
'Apex_Demo_Setting__mdt (Default record): DEMO thresholds used by flows, formulas and validation',
'Lead (shared contract, owned by Person 1): consumed by the Request Sample flow, never renamed', '```', '']
def obj_table(base, obj, title):
    fd = f'{base}/objects/{obj}/fields'
    if not os.path.isdir(fd): return
    om = f'{base}/objects/{obj}/{obj}.object-meta.xml'
    out.append(f'## {title}'); out.append('')
    if os.path.exists(om):
        nf = ET.parse(om).getroot().find(f'{NS}nameField')
        if nf is not None:
            df = nf.find(f'{NS}displayFormat')
            out.append(f'Name field: **{nf.find(NS+"label").text}** ({nf.find(NS+"type").text}{", " + df.text if df is not None else ""})'); out.append('')
    out.append('| Field | API Name | Type | Required | Notes / Picklist values |'); out.append('|---|---|---|---|---|')
    for f in sorted(os.listdir(fd)):
        t = ET.parse(f'{fd}/{f}').getroot()
        g = lambda k: (t.find(NS+k).text if t.find(NS+k) is not None else '')
        typ = g('type'); detail = ''
        if t.find(NS+'formula') is not None: typ = f'Formula ({typ})'; detail = '`' + g('formula').replace('|', '\\|').replace('\n', ' ') + '`'
        elif typ == 'Picklist': detail = ', '.join(v.find(NS+'fullName').text for v in t.iter(NS+'value'))
        elif typ == 'Lookup': detail = f'> {g("referenceTo")} (child relationship {g("relationshipName")}__r)'
        elif typ == 'Summary': detail = f'{g("summaryOperation").upper()} of {g("summarizedField")}'
        elif typ in ('Text', 'LongTextArea'): detail = f'length {g("length")}'
        elif typ in ('Number', 'Currency', 'Percent'): detail = f'{g("precision")},{g("scale")}'
        if g('defaultValue'): detail += f' - default {g("defaultValue")}'
        if g('inlineHelpText'): detail += f' - {g("inlineHelpText")}'
        if g('description'): detail += f' - {g("description")}'
        out.append(f'| {g("label")} | `{g("fullName")}` | {typ} | {"Yes" if g("required") == "true" else ""} | {detail} |')
    out.append('')
for obj, title in [('Sample_Request__c', 'Sample_Request__c (custom, Person 2 primary object)'), ('Competitor_Intel__c', 'Competitor_Intel__c (custom)'), ('Customer_Onboarding__c', 'Customer_Onboarding__c (custom)'), ('Integration_Log__c', 'Integration_Log__c (custom, DEMO SAP audit trail)'), ('Apex_Demo_Setting__mdt', 'Apex_Demo_Setting__mdt (custom metadata type, record "Default")'), ('Opportunity', 'Opportunity (standard + Apex fields)'), ('Account', 'Account (standard + Apex fields)'), ('Quote', 'Quote (standard + Apex fields)'), ('QuoteLineItem', 'QuoteLineItem (standard + Apex fields)'), ('Order', 'Order (standard + Apex fields)'), ('Case', 'Case (standard + Apex fields)'), ('Product2', 'Product2 (standard + Apex fields)')]:
    obj_table(FA, obj, title)
obj_table(SH, 'Lead', 'Lead - shared contract with Person 1 (package directory shared-lead-contract/, frozen API names)')
out += ['## Validation rules', '', '| Object | Rule | Condition | Message |', '|---|---|---|---|']
for path in sorted(glob.glob(f'{FA}/objects/*/validationRules/*.xml')):
    obj = path.split('/')[-3]; t = ET.parse(path).getroot()
    out.append(f'| {obj} | `{t.find(NS+"fullName").text}` | `{t.find(NS+"errorConditionFormula").text}` | {t.find(NS+"errorMessage").text} |')
out += ['', '## Opportunity stages (StandardValueSet OpportunityStage)', '', '| Stage | Probability | Forecast | Closed/Won | Exit evidence enforced |', '|---|---|---|---|---|']
ev = {'Sample Requested': 'At least one Sample Request (on stage change)', 'Sample Testing': 'Set automatically when a sample is dispatched', 'Sample Approved': 'Sample Approved Date (set by the sample approval flow)', 'Technical Evaluation': 'Technical Evaluation Status', 'Pricing Discussion': 'Approved sample (new business)', 'Quotation Sent': 'At least one Quote', 'Negotiation': 'At least one Quote', 'Customer Approval': 'At least one Quote; onboarding checklist created', 'PO Received': 'PO Number + PO Date; Order created', 'Closed Won': 'PO Number + PO Date; set automatically when the Order is activated', 'Closed Lost': 'Loss Reason; re-engagement task in 90 days'}
for sv in ET.parse(f'{FA}/standardValueSets/OpportunityStage.standardValueSet-meta.xml').getroot().iter(NS+'standardValue'):
    ia = sv.find(NS+'isActive')
    if ia is not None and ia.text == 'false': continue
    n = sv.find(NS+'fullName').text
    out.append(f'| {n} | {sv.find(NS+"probability").text}% | {sv.find(NS+"forecastCategory").text} | {sv.find(NS+"closed").text}/{sv.find(NS+"won").text} | {ev.get(n, "")} |')
out += ['', 'Legacy standard stages (Prospecting, Qualification, ...) are deployed as inactive so existing records in the target org are not invalidated.', '',
'## Sample Request status model', '', '```', 'Requested -> (Approval Pending, when quantity > DEMO limit) -> Prepared -> Dispatched -> Customer Testing -> Feedback Received -> Approved | Rejected',
'                                                                                                                       \\- New Sample Iteration (n+1) -> same Opportunity', 'Closed: administrative closure with a reason', '```', '']
open(f'{ROOT}/docs/01-data-model.md', 'w').write('\n'.join(out) + '\n'); print('docs written')
