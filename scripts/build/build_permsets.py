#!/usr/bin/env python3
"""Generates the four Apex demo permission sets from the field inventory produced by build_objects.py."""
import json, os
from xml.sax.saxutils import escape as X
HERE = os.path.dirname(os.path.abspath(__file__))
inv = json.load(open(os.path.join(HERE, 'field_inventory.json')))
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
FA = os.path.join(ROOT, 'force-app', 'main', 'default', 'permissionsets')
os.makedirs(FA, exist_ok=True)
NS = 'http://soap.sforce.com/2006/04/metadata'

CUSTOM_OBJECTS = ['Sample_Request__c', 'Competitor_Intel__c', 'Customer_Onboarding__c', 'Integration_Log__c']
STD_OBJECTS = ['Account', 'Contact', 'Lead', 'Opportunity', 'Product2', 'Pricebook2', 'Quote', 'Order', 'Case']
FLOWS = ['Apex_Lead_Request_Sample', 'Apex_Sample_Request_New_Iteration', 'Apex_Quote_Revise', 'Apex_Order_Send_To_SAP']
TABS = {'Sample_Request__c': 'Sample_Request__c', 'Competitor_Intel__c': 'Competitor_Intel__c', 'Customer_Onboarding__c': 'Customer_Onboarding__c', 'Integration_Log__c': 'Integration_Log__c',
        'Account': 'standard-Account', 'Contact': 'standard-Contact', 'Lead': 'standard-Lead', 'Opportunity': 'standard-Opportunity', 'Product2': 'standard-Product2',
        'Quote': 'standard-Quote', 'Order': 'standard-Order', 'Case': 'standard-Case', 'Dashboard': 'standard-Dashboard', 'Report': 'standard-report'}

def perms(obj, c, r, e, d, va=False, ma=False):
    if ma: d = True
    return (f'    <objectPermissions>\n        <allowCreate>{str(c).lower()}</allowCreate>\n        <allowDelete>{str(d).lower()}</allowDelete>\n        <allowEdit>{str(e).lower()}</allowEdit>\n'
            f'        <allowRead>{str(r).lower()}</allowRead>\n        <modifyAllRecords>{str(ma).lower()}</modifyAllRecords>\n        <object>{obj}</object>\n        <viewAllRecords>{str(va).lower()}</viewAllRecords>\n    </objectPermissions>\n')

STD_FLS = ['Order.OpportunityId', 'Order.PoNumber', 'Order.PoDate', 'Order.Description', 'Quote.Description', 'Quote.ExpirationDate', 'Case.SuppliedEmail', 'Opportunity.Description', 'Account.Description', 'Contact.Description', 'Product2.Description', 'Product2.Family', 'Product2.ProductCode']

def field_perms(editable_objects, readonly_objects):
    out = [(f, True) for f in STD_FLS]
    for obj, fields in inv['fields'].items():
        if obj not in editable_objects and obj not in readonly_objects:
            continue
        for f in fields:
            if f in inv['required'].get(obj, []):
                continue  # required fields cannot carry FLS entries
            ro = f in inv['readonly'].get(obj, []) or obj in readonly_objects
            out.append((f'{obj}.{f}', not ro))
    out.sort()
    return ''.join(f'    <fieldPermissions>\n        <editable>{str(ed).lower()}</editable>\n        <field>{fld}</field>\n        <readable>true</readable>\n    </fieldPermissions>\n' for fld, ed in out)

def permset(api, label, desc, objperms, editable_objects, readonly_objects, tabs, flows=True, apex=True, user_perms=()):
    x = '<?xml version="1.0" encoding="UTF-8"?>\n' + f'<PermissionSet xmlns="{NS}">\n'
    x += '    <applicationVisibilities>\n        <application>Apex_Sales</application>\n        <visible>true</visible>\n    </applicationVisibilities>\n'
    if apex:
        x += '    <classAccesses>\n        <apexClass>LeadSampleConversionService</apexClass>\n        <enabled>true</enabled>\n    </classAccesses>\n'
    x += '    <customMetadataTypeAccesses>\n        <enabled>true</enabled>\n        <name>Apex_Demo_Setting__mdt</name>\n    </customMetadataTypeAccesses>\n'
    x += f'    <description>{X(desc)}</description>\n'
    x += field_perms(editable_objects, readonly_objects)
    if flows:
        for fl in FLOWS:
            x += f'    <flowAccesses>\n        <enabled>true</enabled>\n        <flow>{fl}</flow>\n    </flowAccesses>\n'
    x += f'    <hasActivationRequired>false</hasActivationRequired>\n    <label>{X(label)}</label>\n'
    x += ''.join(objperms)
    for t in tabs:
        x += f'    <tabSettings>\n        <tab>{TABS[t]}</tab>\n        <visibility>Visible</visibility>\n    </tabSettings>\n'
    for up in user_perms:
        x += f'    <userPermissions>\n        <enabled>true</enabled>\n        <name>{up}</name>\n    </userPermissions>\n'
    x += '</PermissionSet>\n'
    open(os.path.join(FA, f'{api}.permissionset-meta.xml'), 'w').write(x)

ALL = CUSTOM_OBJECTS + STD_OBJECTS
ALL_TABS = list(TABS.keys())

# Sales Executive: create/edit own records across the lifecycle, no delete on commercial records
permset('Apex_Sales_Executive', 'Apex Sales Executive',
        'Person 2 demo role. Owns leads, accounts, sample requests, opportunities, quotes and activities end to end.',
        [perms('Sample_Request__c', 1, 1, 1, 0), perms('Competitor_Intel__c', 1, 1, 1, 1), perms('Customer_Onboarding__c', 1, 1, 1, 0), perms('Integration_Log__c', 0, 1, 0, 0),
         perms('Account', 1, 1, 1, 0), perms('Contact', 1, 1, 1, 0), perms('Lead', 1, 1, 1, 0), perms('Opportunity', 1, 1, 1, 0), perms('Product2', 0, 1, 0, 0),
         perms('Pricebook2', 0, 1, 0, 0), perms('Quote', 1, 1, 1, 0), perms('Order', 1, 1, 1, 0), perms('Case', 1, 1, 1, 0)],
        editable_objects=ALL, readonly_objects=['Integration_Log__c', 'Product2'], tabs=ALL_TABS, user_perms=['RunReports'])

# Sales Manager: team visibility, approvals, dashboards
permset('Apex_Sales_Manager', 'Apex Sales Manager',
        'Person 2 demo role. Team visibility on the whole lifecycle, quote approvals, reports and dashboards.',
        [perms('Sample_Request__c', 1, 1, 1, 1, va=True, ma=True), perms('Competitor_Intel__c', 1, 1, 1, 1, va=True, ma=True), perms('Customer_Onboarding__c', 1, 1, 1, 1, va=True, ma=True),
         perms('Integration_Log__c', 0, 1, 0, 0, va=True), perms('Account', 1, 1, 1, 1, va=True, ma=True), perms('Contact', 1, 1, 1, 1, va=True, ma=True), perms('Lead', 1, 1, 1, 1, va=True, ma=True),
         perms('Opportunity', 1, 1, 1, 1, va=True, ma=True), perms('Product2', 1, 1, 1, 0, va=True), perms('Pricebook2', 1, 1, 1, 0), perms('Quote', 1, 1, 1, 1, va=True, ma=True),
         perms('Order', 1, 1, 1, 1, va=True, ma=True), perms('Case', 1, 1, 1, 1, va=True, ma=True)],
        editable_objects=ALL, readonly_objects=['Integration_Log__c'], tabs=ALL_TABS, user_perms=['RunReports', 'CreateCustomizeReports', 'CreateCustomizeDashboards'])

# Sales Admin: samples, products/pricebook, onboarding documents, orders and SAP handoff
permset('Apex_Sales_Admin', 'Apex Sales Admin',
        'Person 2 demo role. Factory / operations support: sample preparation and dispatch queue, product catalogue and price book, onboarding checklist, order activation and the simulated SAP handoff.',
        [perms('Sample_Request__c', 1, 1, 1, 0, va=True, ma=True), perms('Competitor_Intel__c', 0, 1, 0, 0, va=True), perms('Customer_Onboarding__c', 1, 1, 1, 0, va=True, ma=True),
         perms('Integration_Log__c', 1, 1, 1, 0, va=True), perms('Account', 0, 1, 1, 0, va=True), perms('Contact', 1, 1, 1, 0, va=True), perms('Lead', 0, 1, 0, 0, va=True),
         perms('Opportunity', 0, 1, 1, 0, va=True), perms('Product2', 1, 1, 1, 0, va=True), perms('Pricebook2', 1, 1, 1, 0), perms('Quote', 0, 1, 0, 0, va=True),
         perms('Order', 1, 1, 1, 0, va=True, ma=True), perms('Case', 1, 1, 1, 0, va=True)],
        editable_objects=['Sample_Request__c', 'Customer_Onboarding__c', 'Integration_Log__c', 'Account', 'Order', 'Product2', 'Case', 'Opportunity', 'Contact'],
        readonly_objects=['Competitor_Intel__c', 'Lead', 'Quote', 'QuoteLineItem'], tabs=ALL_TABS, user_perms=['RunReports'])

# Management: read everything, dashboards, final approvals
permset('Apex_Management', 'Apex Management',
        'Person 2 demo role. Broad read visibility, dashboards, and final quote approval.',
        [perms('Sample_Request__c', 0, 1, 0, 0, va=True), perms('Competitor_Intel__c', 0, 1, 0, 0, va=True), perms('Customer_Onboarding__c', 0, 1, 0, 0, va=True),
         perms('Integration_Log__c', 0, 1, 0, 0, va=True), perms('Account', 0, 1, 1, 0, va=True), perms('Contact', 0, 1, 0, 0, va=True), perms('Lead', 0, 1, 0, 0, va=True),
         perms('Opportunity', 0, 1, 1, 0, va=True), perms('Product2', 0, 1, 0, 0, va=True), perms('Pricebook2', 0, 1, 0, 0), perms('Quote', 0, 1, 1, 0, va=True),
         perms('Order', 0, 1, 0, 0, va=True), perms('Case', 0, 1, 0, 0, va=True)],
        editable_objects=['Opportunity', 'Quote', 'Account'], readonly_objects=['Sample_Request__c', 'Competitor_Intel__c', 'Customer_Onboarding__c', 'Integration_Log__c', 'Lead', 'Order', 'Case', 'Product2', 'QuoteLineItem'],
        tabs=ALL_TABS, flows=False, apex=False, user_perms=['RunReports', 'CreateCustomizeDashboards'])
print('permission sets written')
