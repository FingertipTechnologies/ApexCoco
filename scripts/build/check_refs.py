#!/usr/bin/env python3
"""Cross-reference checker: every custom field / flow / page / object referenced anywhere must exist in the source tree."""
import os, re, sys, glob
from xml.etree import ElementTree as ET
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
FA = f'{ROOT}/force-app/main/default'
SH = f'{ROOT}/shared-lead-contract/main/default'
NS = '{http://soap.sforce.com/2006/04/metadata}'
errors = []

# ---- inventory of defined custom fields per object
fields = {}
for base in (FA, SH):
    for obj in os.listdir(f'{base}/objects'):
        fd = f'{base}/objects/{obj}/fields'
        if os.path.isdir(fd):
            fields.setdefault(obj, set()).update(f.replace('.field-meta.xml', '') for f in os.listdir(fd))
custom_objects = {o for o in os.listdir(f'{FA}/objects') if o.endswith('__c') or o.endswith('__mdt')}
flows = {f.replace('.flow-meta.xml', '') for f in os.listdir(f'{FA}/flows')}
pages = {f.replace('.flexipage-meta.xml', '') for f in os.listdir(f'{FA}/flexipages')}
quick_actions = {f.replace('.quickAction-meta.xml', '') for f in os.listdir(f'{FA}/quickActions')}
compacts = {}
for obj in os.listdir(f'{FA}/objects'):
    cd = f'{FA}/objects/{obj}/compactLayouts'
    if os.path.isdir(cd):
        compacts[obj] = {f.replace('.compactLayout-meta.xml', '') for f in os.listdir(cd)}

STD_FIELDS = {  # standard fields we reference; anything ending in __c must be in inventory
    'Opportunity': {'Name', 'AccountId', 'StageName', 'CloseDate', 'Amount', 'Probability', 'OwnerId', 'LeadSource', 'Type', 'Description', 'IsClosed', 'IsWon', 'LastActivityDate', 'CreatedDate', 'Id', 'CreatedById', 'LastModifiedById', 'ForecastCategoryName'},
    'Account': {'Name', 'Industry', 'Website', 'Phone', 'OwnerId', 'Type', 'ParentId', 'AnnualRevenue', 'NumberOfEmployees', 'Description', 'BillingAddress', 'ShippingAddress', 'BillingCountry', 'Id', 'CreatedById', 'LastModifiedById'},
    'Quote': {'Name', 'QuoteNumber', 'OpportunityId', 'AccountId', 'ContactId', 'OwnerId', 'Status', 'ExpirationDate', 'Pricebook2Id', 'Description', 'Subtotal', 'Discount', 'TotalPrice', 'GrandTotal', 'Email', 'Phone', 'BillingAddress', 'ShippingAddress', 'Id', 'CreatedById', 'LastModifiedById', 'CreatedDate'},
    'Order': {'OrderNumber', 'AccountId', 'OpportunityId', 'Status', 'EffectiveDate', 'OwnerId', 'PoNumber', 'PoDate', 'Pricebook2Id', 'TotalAmount', 'Description', 'BillingAddress', 'ShippingAddress', 'Id', 'CreatedById', 'LastModifiedById', 'CreatedDate'},
    'Case': {'CaseNumber', 'ContactId', 'AccountId', 'OwnerId', 'Origin', 'Status', 'Priority', 'Subject', 'Description', 'Id', 'CreatedById', 'LastModifiedById'},
}

def check_field(obj, fld, where):
    if fld.endswith('__c'):
        if fld not in fields.get(obj, set()):
            errors.append(f'{where}: {obj}.{fld} not defined')
    elif obj in STD_FIELDS and fld not in STD_FIELDS[obj] and obj in custom_objects:
        errors.append(f'{where}: {obj}.{fld} unknown')

# ---- layouts
for path in glob.glob(f'{FA}/layouts/*.xml') + glob.glob(f'{SH}/layouts/*.xml'):
    obj = os.path.basename(path).split('-')[0]
    t = ET.parse(path).getroot()
    for li in t.iter(f'{NS}layoutItems'):
        f = li.find(f'{NS}field')
        if f is not None:
            check_field(obj, f.text, os.path.basename(path))
    for rl in t.iter(f'{NS}relatedList'):
        if '.' in rl.text:
            o, f = rl.text.split('.')
            check_field(o, f, os.path.basename(path) + ' relatedList')
    for qa in t.iter(f'{NS}quickActionName'):
        if qa.text not in quick_actions: errors.append(f'{path}: quick action {qa.text} missing')
    for an in t.iter(f'{NS}actionName'):
        if '.' in an.text and an.text not in quick_actions and not an.text.startswith(('NewTask','LogACall','NewEvent','SendEmail')): errors.append(f'{path}: platform action {an.text} missing')

# ---- flexipages
for path in glob.glob(f'{FA}/flexipages/*.xml') + glob.glob(f'{SH}/flexipages/*.xml'):
    t = ET.parse(path).getroot()
    obj = t.find(f'{NS}sobjectType').text
    for cp in t.iter(f'{NS}componentInstanceProperties'):
        n, v = cp.find(f'{NS}name').text, cp.find(f'{NS}value').text
        if n == 'parentFieldApiName' and v.endswith('__c') and not any(v in fs for fs in fields.values()):
            errors.append(f'{os.path.basename(path)}: related-list parent field {v} not defined on any object')

# ---- objects: action overrides -> flexipages, compact layout assignments
for obj in os.listdir(f'{FA}/objects'):
    om = f'{FA}/objects/{obj}/{obj}.object-meta.xml'
    if os.path.exists(om):
        t = ET.parse(om).getroot()
        for c in t.iter(f'{NS}content'):
            if c.text not in pages: errors.append(f'{obj}: flexipage {c.text} missing')
        ca = t.find(f'{NS}compactLayoutAssignment')
        if ca is not None and ca.text != 'SYSTEM' and ca.text not in compacts.get(obj, set()):
            errors.append(f'{obj}: compact layout {ca.text} missing')
    cd = f'{FA}/objects/{obj}/compactLayouts'
    if os.path.isdir(cd):
        for cf in os.listdir(cd):
            for f in ET.parse(f'{cd}/{cf}').getroot().iter(f'{NS}fields'):
                check_field(obj, f.text, cf)
    ld = f'{FA}/objects/{obj}/listViews'
    if os.path.isdir(ld):
        for lf in os.listdir(ld):
            t = ET.parse(f'{ld}/{lf}').getroot()
            for c in list(t.iter(f'{NS}columns')) + list(t.iter(f'{NS}field')):
                if c.text.endswith('__c'): check_field(obj, c.text, lf)
    vd = f'{FA}/objects/{obj}/validationRules'
    if os.path.isdir(vd):
        for vf in os.listdir(vd):
            t = ET.parse(f'{vd}/{vf}').getroot()
            formula = t.find(f'{NS}errorConditionFormula').text
            for m in set(re.findall(r'\b([A-Za-z0-9_]+__c)\b', formula)):
                check_field(obj, m, vf)
            edf = t.find(f'{NS}errorDisplayField')
            if edf is not None: check_field(obj, edf.text, vf)
    # formula fields referencing other fields on same object
    for ff in fields.get(obj, set()):
        p = f'{FA}/objects/{obj}/fields/{ff}.field-meta.xml'
        if not os.path.exists(p): continue
        t = ET.parse(p).getroot()
        fo = t.find(f'{NS}formula')
        if fo is not None:
            for m in set(re.findall(r'(?<![.$\w])([A-Za-z0-9_]+__c)\b', fo.text)):
                check_field(obj, m, f'{obj}.{ff} formula')

# ---- flows: field references in filters / inputAssignments / assignToReference with $Record.X and object context
for path in glob.glob(f'{FA}/flows/*.xml'):
    t = ET.parse(path).getroot()
    name = os.path.basename(path)
    start = t.find(f'{NS}start')
    trig_obj = start.find(f'{NS}object').text if start is not None and start.find(f'{NS}object') is not None else None
    # $Record.Field__c references
    if trig_obj:
        for m in set(re.findall(r'\$Record(?:__Prior)?\.([A-Za-z0-9_]+__c)\b', open(path).read())):
            check_field(trig_obj, m, name + ' $Record')
    # recordLookups/Creates/Updates with object
    for tag in ('recordLookups', 'recordCreates', 'recordUpdates'):
        for el in t.iter(f'{NS}{tag}'):
            o = el.find(f'{NS}object')
            if o is None: continue
            for f in list(el.iter(f'{NS}field')):
                check_field(o.text, f.text, f'{name}:{el.find(NS+"name").text}')
    # connectors target existing elements
    names = {n.text for n in t.iter(f'{NS}name')}
    for tr in t.iter(f'{NS}targetReference'):
        if tr.text not in names: errors.append(f'{name}: connector target {tr.text} missing')
    # element references to formulas/variables/elements
    defined = set()
    for tag in ('formulas', 'variables', 'choices', 'dynamicChoiceSets', 'recordLookups', 'recordCreates', 'actionCalls', 'loops', 'screens', 'assignments', 'decisions', 'recordUpdates', 'customErrors', 'textTemplates'):
        for el in t.iter(f'{NS}{tag}'):
            defined.add(el.find(f'{NS}name').text)
    for sc in t.iter(f'{NS}screens'):
        for fl in sc.iter(f'{NS}fields'):
            defined.add(fl.find(f'{NS}name').text)
    for er in t.iter(f'{NS}elementReference'):
        base = er.text.split('.')[0]
        if base.startswith('$'): continue
        if base not in defined: errors.append(f'{name}: elementReference {er.text} undefined')
    for atr in t.iter(f'{NS}assignToReference'):
        base = atr.text.split('.')[0]
        if base.startswith('$'): continue
        if base not in defined: errors.append(f'{name}: assignToReference {atr.text} undefined')
    for m in set(re.findall(r'\{!([A-Za-z0-9_]+)', open(path).read())):
        if m.startswith('$'): continue
        if m not in defined: errors.append(f'{name}: merge field {m} undefined')
    # apex action
    for ac in t.iter(f'{NS}actionCalls'):
        if ac.find(f'{NS}actionType').text == 'apex':
            cls = ac.find(f'{NS}actionName').text
            if not os.path.exists(f'{FA}/classes/{cls}.cls'): errors.append(f'{name}: apex class {cls} missing')

# ---- quick actions -> flows / target objects
for path in glob.glob(f'{FA}/quickActions/*.xml'):
    t = ET.parse(path).getroot()
    fd = t.find(f'{NS}flowDefinition')
    if fd is not None and fd.text not in flows: errors.append(f'{path}: flow {fd.text} missing')
    to = t.find(f'{NS}targetObject')
    if to is not None:
        for f in t.iter(f'{NS}field'):
            check_field(to.text, f.text, os.path.basename(path))
        tp = t.find(f'{NS}targetParentField')
        if tp is not None: check_field(to.text, tp.text, os.path.basename(path))

# ---- permission sets
for path in glob.glob(f'{FA}/permissionsets/*.xml'):
    t = ET.parse(path).getroot()
    for fp in t.iter(f'{NS}fieldPermissions'):
        o, f = fp.find(f'{NS}field').text.split('.')
        check_field(o, f, os.path.basename(path))
    for fa in t.iter(f'{NS}flowAccesses'):
        if fa.find(f'{NS}flow').text not in flows: errors.append(f'{path}: flow missing')

# ---- path assistants
for path in glob.glob(f'{FA}/pathAssistants/*.xml') + glob.glob(f'{SH}/pathAssistants/*.xml'):
    t = ET.parse(path).getroot()
    obj = t.find(f'{NS}entityName').text
    for f in t.iter(f'{NS}fieldNames'):
        check_field(obj, f.text, os.path.basename(path))

# ---- reports
for path in glob.glob(f'{FA}/reports/*/*.xml'):
    txt = open(path).read()
    for m in set(re.findall(r'([A-Za-z0-9_]+)[.$]([A-Za-z0-9_]+__c)', txt)):
        if m[0] != 'CustomEntity': check_field(m[0], m[1], os.path.basename(path))

# ---- approval process field references
for path in glob.glob(f'{FA}/approvalProcesses/*.xml'):
    t = ET.parse(path).getroot()
    for f in t.iter(f'{NS}field'):
        if f.text.endswith('__c'): check_field('Quote', f.text, os.path.basename(path))
    for ap in t.iter(f'{NS}approver'):
        n = ap.find(f'{NS}name')
        if n is not None: check_field('Quote', n.text, os.path.basename(path))
for path in glob.glob(f'{FA}/workflows/*.xml'):
    t = ET.parse(path).getroot()
    for f in t.iter(f'{NS}field'):
        check_field('Quote', f.text, os.path.basename(path))

# ---- custom metadata record fields
for path in glob.glob(f'{FA}/customMetadata/*.xml'):
    t = ET.parse(path).getroot()
    for f in t.iter(f'{NS}field'):
        check_field('Apex_Demo_Setting__mdt', f.text, os.path.basename(path))

if errors:
    print('\n'.join(sorted(set(errors))))
    print(f'\n{len(set(errors))} problems')
    sys.exit(1)
print('All cross-references resolve.')
