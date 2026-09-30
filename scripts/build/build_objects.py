#!/usr/bin/env python3
"""Generates object/field/validation-rule/list-view/compact-layout metadata for the Apex Person 2 build.
Run from repo root. Idempotent: rewrites the generated files each time."""
import os, json
from xml.sax.saxutils import escape as X

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
FA = os.path.join(ROOT, 'force-app', 'main', 'default')
SHARED = os.path.join(ROOT, 'shared-lead-contract', 'main', 'default')
NS = 'http://soap.sforce.com/2006/04/metadata'
HDR = '<?xml version="1.0" encoding="UTF-8"?>\n'

def w(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)

# ---------------------------------------------------------------- field builders
def picklist_xml(values, default=None, restricted=True, inactive=()):
    vals = ''.join(
        f'            <value>\n                <fullName>{X(v)}</fullName>\n                <default>{"true" if v == default else "false"}</default>\n                <label>{X(v)}</label>\n            </value>\n'
        for v in values)
    vals += ''.join(
        f'            <value>\n                <fullName>{X(v)}</fullName>\n                <default>false</default>\n                <isActive>false</isActive>\n                <label>{X(v)}</label>\n            </value>\n'
        for v in inactive)
    return (f'    <valueSet>\n        <restricted>{"true" if restricted else "false"}</restricted>\n'
            f'        <valueSetDefinition>\n            <sorted>false</sorted>\n{vals}        </valueSetDefinition>\n    </valueSet>\n')

def field_xml(f, track_history=False):
    """f: dict with keys api,label,type + type specifics. Emits elements in Metadata API (alphabetical) order."""
    t = f['type']
    parts = [f'    <fullName>{f["api"]}</fullName>\n']
    if f.get('default') is not None and t not in ('Picklist',):
        parts.append(f'    <defaultValue>{X(str(f["default"]))}</defaultValue>\n')
    if t == 'Lookup':
        parts.append(f'    <deleteConstraint>{f.get("deleteConstraint", "SetNull")}</deleteConstraint>\n')
    if f.get('description'):
        parts.append(f'    <description>{X(f["description"])}</description>\n')
    if t == 'AutoNumber':
        parts.append(f'    <displayFormat>{X(f["displayFormat"])}</displayFormat>\n')
    parts.append('    <externalId>false</externalId>\n')
    if t == 'MetadataNumber' or t == 'MetadataText':
        parts.append('    <fieldManageability>DeveloperControlled</fieldManageability>\n')
    if f.get('formula'):
        parts.append(f'    <formula>{X(f["formula"])}</formula>\n')
        if f.get('blanks'):
            parts.append(f'    <formulaTreatBlanksAs>{f["blanks"]}</formulaTreatBlanksAs>\n')
    if f.get('help'):
        parts.append(f'    <inlineHelpText>{X(f["help"])}</inlineHelpText>\n')
    parts.append(f'    <label>{X(f["label"])}</label>\n')
    if t in ('Text', 'LongTextArea', 'MetadataText') and not f.get('formula'):
        parts.append(f'    <length>{f.get("length", 255)}</length>\n')
    if t in ('Number', 'Currency', 'Percent', 'MetadataNumber') and not f.get('formula'):
        parts.append(f'    <precision>{f.get("precision", 18)}</precision>\n')
    if t == 'Lookup':
        parts.append(f'    <referenceTo>{f["referenceTo"]}</referenceTo>\n')
        parts.append(f'    <relationshipLabel>{X(f["relationshipLabel"])}</relationshipLabel>\n')
        parts.append(f'    <relationshipName>{f["relationshipName"]}</relationshipName>\n')
    if t not in ('AutoNumber', 'MetadataNumber', 'MetadataText') and not f.get('formula') and t != 'Summary':
        parts.append(f'    <required>{"true" if f.get("required") else "false"}</required>\n')
    if t in ('Number', 'Currency', 'Percent', 'MetadataNumber') and not f.get('formula'):
        parts.append(f'    <scale>{f.get("scale", 2)}</scale>\n')
    if t == 'Summary':
        parts.append(f'    <summarizedField>{f["summarizedField"]}</summarizedField>\n')
        parts.append(f'    <summaryForeignKey>{f["summaryForeignKey"]}</summaryForeignKey>\n')
        parts.append(f'    <summaryOperation>{f["summaryOperation"]}</summaryOperation>\n')
    if track_history and t != 'Summary' and not f.get('formula') and t != 'AutoNumber' and t != 'LongTextArea':
        parts.append(f'    <trackHistory>{"true" if f.get("track") else "false"}</trackHistory>\n')
    if f.get('formula'):
        ftype = f['formulaType']
        if ftype in ('Number', 'Percent', 'Currency'):
            parts.insert(len(parts), f'    <precision>18</precision>\n')  # precision/scale after label is wrong order; handled below
        parts = [p for p in parts if not p.startswith('    <precision>')]
    parts.append(f'    <type>{f.get("formulaType") if f.get("formula") else ("Number" if t=="MetadataNumber" else "Text" if t=="MetadataText" else t)}</type>\n')
    if t == 'Checkbox' and not f.get('formula'):
        pass
    if t == 'Picklist':
        parts.append(picklist_xml(f['values'], f.get('default'), f.get('restricted', True), f.get('inactive', ())))
    if t == 'MultiselectPicklist':
        parts.append(picklist_xml(f['values'], f.get('default'), f.get('restricted', True)))
    if t in ('LongTextArea', 'MultiselectPicklist'):
        parts.append(f'    <visibleLines>{f.get("visibleLines", 4)}</visibleLines>\n')
    body = ''.join(parts)
    # formula fields: precision/scale must appear (alphabetically) before 'required'/'type'. Rebuild properly.
    if f.get('formula') and f['formulaType'] in ('Number', 'Percent', 'Currency'):
        lines = body.split('\n')
        out = []
        inserted = False
        for ln in lines:
            if not inserted and (ln.startswith('    <type>') or ln.startswith('    <required>')):
                out.append(f'    <precision>18</precision>')
                out.append(f'    <scale>{f.get("scale", 2)}</scale>')
                inserted = True
            out.append(ln)
        body = '\n'.join(out)
    return HDR + f'<CustomField xmlns="{NS}">\n' + body + '</CustomField>\n'

def write_fields(base, obj, fields, track_history=False):
    for f in fields:
        w(os.path.join(base, 'objects', obj, 'fields', f'{f["api"]}.field-meta.xml'), field_xml(f, track_history))

def custom_object_xml(label, plural, name_label, autonumber=None, history=True, activities=True, compact=None, description=None, sharing='ReadWrite', action_page=None):
    ao = ''
    if action_page:
        ao = ('    <actionOverrides>\n        <actionName>View</actionName>\n        <type>Default</type>\n    </actionOverrides>\n'
              f'    <actionOverrides>\n        <actionName>View</actionName>\n        <content>{action_page}</content>\n        <formFactor>Large</formFactor>\n        <skipRecordTypeSelect>false</skipRecordTypeSelect>\n        <type>Flexipage</type>\n    </actionOverrides>\n'
              f'    <actionOverrides>\n        <actionName>View</actionName>\n        <content>{action_page}</content>\n        <formFactor>Small</formFactor>\n        <skipRecordTypeSelect>false</skipRecordTypeSelect>\n        <type>Flexipage</type>\n    </actionOverrides>\n')
    nf = (f'    <nameField>\n        <displayFormat>{X(autonumber)}</displayFormat>\n        <label>{X(name_label)}</label>\n        <type>AutoNumber</type>\n    </nameField>\n'
          if autonumber else f'    <nameField>\n        <label>{X(name_label)}</label>\n        <type>Text</type>\n    </nameField>\n')
    return (HDR + f'<CustomObject xmlns="{NS}">\n' + ao +
            '    <allowInChatterGroups>false</allowInChatterGroups>\n'
            f'    <compactLayoutAssignment>{compact or "SYSTEM"}</compactLayoutAssignment>\n'
            '    <deploymentStatus>Deployed</deploymentStatus>\n'
            + (f'    <description>{X(description)}</description>\n' if description else '') +
            f'    <enableActivities>{"true" if activities else "false"}</enableActivities>\n'
            '    <enableBulkApi>true</enableBulkApi>\n'
            '    <enableFeeds>false</enableFeeds>\n'
            f'    <enableHistory>{"true" if history else "false"}</enableHistory>\n'
            '    <enableLicensing>false</enableLicensing>\n'
            '    <enableReports>true</enableReports>\n'
            '    <enableSearch>true</enableSearch>\n'
            '    <enableSharing>true</enableSharing>\n'
            '    <enableStreamingApi>true</enableStreamingApi>\n'
            '    <externalSharingModel>Private</externalSharingModel>\n'
            f'    <label>{X(label)}</label>\n' + nf +
            f'    <pluralLabel>{X(plural)}</pluralLabel>\n'
            '    <searchLayouts/>\n'
            f'    <sharingModel>{sharing}</sharingModel>\n'
            '    <visibility>Public</visibility>\n'
            '</CustomObject>\n')

def standard_object_xml(action_page=None, compact=None):
    ao = ''
    if action_page:
        ao = ('    <actionOverrides>\n        <actionName>View</actionName>\n        <type>Default</type>\n    </actionOverrides>\n'
              f'    <actionOverrides>\n        <actionName>View</actionName>\n        <content>{action_page}</content>\n        <formFactor>Large</formFactor>\n        <skipRecordTypeSelect>false</skipRecordTypeSelect>\n        <type>Flexipage</type>\n    </actionOverrides>\n'
              f'    <actionOverrides>\n        <actionName>View</actionName>\n        <content>{action_page}</content>\n        <formFactor>Small</formFactor>\n        <skipRecordTypeSelect>false</skipRecordTypeSelect>\n        <type>Flexipage</type>\n    </actionOverrides>\n')
    ca = f'    <compactLayoutAssignment>{compact}</compactLayoutAssignment>\n' if compact else ''
    return HDR + f'<CustomObject xmlns="{NS}">\n' + ao + ca + '</CustomObject>\n'

def vr_xml(name, formula, message, field=None, description=None):
    return (HDR + f'<ValidationRule xmlns="{NS}">\n    <fullName>{name}</fullName>\n    <active>true</active>\n'
            + (f'    <description>{X(description)}</description>\n' if description else '')
            + f'    <errorConditionFormula>{X(formula)}</errorConditionFormula>\n'
            + (f'    <errorDisplayField>{field}</errorDisplayField>\n' if field else '')
            + f'    <errorMessage>{X(message)}</errorMessage>\n</ValidationRule>\n')

def listview_xml(name, label, columns, filters=None, scope='Everything', logic=None):
    cols = ''.join(f'    <columns>{c}</columns>\n' for c in columns)
    flt = ''
    if filters:
        for fld, op, val in filters:
            flt += f'    <filters>\n        <field>{fld}</field>\n        <operation>{op}</operation>\n' + (f'        <value>{X(val)}</value>\n' if val is not None else '') + '    </filters>\n'
    bl = f'    <booleanFilter>{X(logic)}</booleanFilter>\n' if logic else ''
    return (HDR + f'<ListView xmlns="{NS}">\n    <fullName>{name}</fullName>\n' + bl + cols +
            f'    <filterScope>{scope}</filterScope>\n' + flt + f'    <label>{X(label)}</label>\n</ListView>\n')

def compact_xml(name, label, fields):
    return HDR + f'<CompactLayout xmlns="{NS}">\n    <fullName>{name}</fullName>\n' + ''.join(f'    <fields>{f}</fields>\n' for f in fields) + f'    <label>{X(label)}</label>\n</CompactLayout>\n'

# ---------------------------------------------------------------- shared picklists
CUSTOMER_TYPES = ['Importer', 'Brand Owner', 'Manufacturer', 'Distributor', 'Trader', 'Retailer', 'Private Label Customer', 'B2C Customer']
VOLUME_UNITS = ['MT', 'KG', 'Other']
TIMELINES = ['Immediate', '3 Months', '6 Months', '12 Months', 'Long Term']
ITEM_STATUS = ['Pending', 'In Progress', 'Complete', 'Not Required']
ITEM_OWNER = ['Sales Admin', 'Finance', 'Quality', 'Operations', 'Compliance', 'Sales Executive']
CMDT = '$CustomMetadata.Apex_Demo_Setting__mdt.Default.'

# ================================================================ Sample_Request__c
SR = [
 dict(api='Account__c', label='Account', type='Lookup', referenceTo='Account', relationshipLabel='Sample Requests', relationshipName='Sample_Requests', deleteConstraint='Restrict', track=True, help='Filled automatically from the Opportunity or parent sample when left blank.'),
 dict(api='Contact__c', label='Contact', type='Lookup', referenceTo='Contact', relationshipLabel='Sample Requests', relationshipName='Sample_Requests', required=True, deleteConstraint='Restrict'),
 dict(api='Lead__c', label='Source Lead', type='Lookup', referenceTo='Lead', relationshipLabel='Sample Requests', relationshipName='Sample_Requests', description='Retains the qualified Lead supplied by Person 1 (Visiting Card -> Lead).'),
 dict(api='Opportunity__c', label='Opportunity', type='Lookup', referenceTo='Opportunity', relationshipLabel='Sample Requests', relationshipName='Sample_Requests', track=True, description='Commercial context. Populated automatically by the flow Apex_Sample_Request_After_Create when left blank.'),
 dict(api='Product__c', label='Product', type='Lookup', referenceTo='Product2', relationshipLabel='Sample Requests', relationshipName='Sample_Requests', track=True),
 dict(api='Specification__c', label='Specification / Grade', type='Text', length=255, help='Spec or grade requested by the customer. Change it on the next iteration when the customer asks for an adjustment.', track=True),
 dict(api='Sample_Quantity__c', label='Sample Quantity', type='Number', precision=16, scale=2, required=True),
 dict(api='Sample_Unit__c', label='Sample Unit', type='Picklist', values=['KG', 'G', 'Other'], default='KG', required=True),
 dict(api='Batch_Number__c', label='Batch Number', type='Text', length=50, track=True),
 dict(api='Requested_Date__c', label='Requested Date', type='Date', required=True, default='TODAY()'),
 dict(api='Prepared_Date__c', label='Prepared Date', type='Date'),
 dict(api='Dispatch_Date__c', label='Dispatch Date', type='Date', track=True),
 dict(api='Expected_Delivery__c', label='Expected Delivery', type='Date'),
 dict(api='Courier_Partner__c', label='Courier Partner', type='Text', length=100, help='Required when the status is Dispatched.', track=True),
 dict(api='Tracking_Number__c', label='Tracking Number', type='Text', length=100, help='Required when the status is Dispatched.', track=True),
 dict(api='Tracking_Link__c', label='Tracking Link', type='Text', formula='IF(ISBLANK(Tracking_Number__c), "", HYPERLINK("https://www.google.com/search?q=" & Tracking_Number__c, "Track " & Tracking_Number__c, "_blank"))', formulaType='Text'),
 dict(api='Status__c', label='Status', type='Picklist', required=True, default='Requested', track=True,
      values=['Requested', 'Approval Pending', 'Prepared', 'Dispatched', 'Customer Testing', 'Feedback Received', 'Approved', 'Rejected', 'Closed']),
 dict(api='Feedback_Due_Date__c', label='Feedback Due Date', type='Date'),
 dict(api='Customer_Feedback__c', label='Customer Feedback', type='LongTextArea', length=32768, visibleLines=4, help='Required when the status is Feedback Received and before a sample can be approved.'),
 dict(api='Feedback_Received_Date__c', label='Feedback Received Date', type='Date'),
 dict(api='Result__c', label='Result', type='Picklist', values=['Pending', 'Approved', 'Rejected'], default='Pending', track=True),
 dict(api='Rejection_Reason__c', label='Rejection Reason', type='Picklist', track=True,
      values=['Texture / Specification', 'Taste', 'Colour', 'Moisture', 'Particle Size', 'Fat Content', 'Microbiology', 'Packaging', 'Price', 'Other']),
 dict(api='Approval_Date__c', label='Approval Date', type='Date', track=True),
 dict(api='Iteration_Number__c', label='Iteration Number', type='Number', precision=3, scale=0, required=True, default='1'),
 dict(api='Parent_Sample_Request__c', label='Parent Sample Request', type='Lookup', referenceTo='Sample_Request__c', relationshipLabel='Sample Iterations', relationshipName='Sample_Iterations', help='Links iteration 2, 3... back to the previous sample for the same opportunity.'),
 dict(api='Next_Action__c', label='Next Action', type='Text', length=255, help='Required when a sample is rejected.', track=True),
 dict(api='Next_Action_Date__c', label='Next Action Date', type='Date'),
 dict(api='Closure_Reason__c', label='Closure Reason', type='Text', length=255, help='Required when the status is Closed.'),
 dict(api='Notes__c', label='Notes', type='LongTextArea', length=32768, visibleLines=3),
 dict(api='Days_Since_Request__c', label='Days Since Request', type='Number', formula='TODAY() - Requested_Date__c', formulaType='Number', scale=0, blanks='BlankAsZero'),
 dict(api='Days_Pending_Feedback__c', label='Days Pending Feedback', type='Number', formulaType='Number', scale=0, blanks='BlankAsZero',
      formula='IF(ISPICKVAL(Status__c, "Customer Testing"), TODAY() - BLANKVALUE(Dispatch_Date__c, Requested_Date__c), 0)'),
 dict(api='Is_Open__c', label='Is Open', type='Checkbox', formulaType='Checkbox',
      formula='NOT(OR(ISPICKVAL(Status__c, "Approved"), ISPICKVAL(Status__c, "Rejected"), ISPICKVAL(Status__c, "Closed")))'),
]
SR_VRS = [
 ('VR_Product_Required', 'ISBLANK(Product__c)', 'Select the product to sample.', 'Product__c', 'Product lookup to Product2 cannot be DB-required (Product2 does not allow restrict delete).'),
 ('VR_Account_Required', 'ISBLANK(Account__c)', 'Account is required. It is filled automatically when the sample is created from an Opportunity or a parent sample.', 'Account__c', None),
 ('VR_Dispatch_Requires_Courier_Tracking', 'ISPICKVAL(Status__c, "Dispatched") && (ISBLANK(Courier_Partner__c) || ISBLANK(Tracking_Number__c))',
  'Courier partner and tracking number are required before a sample can be marked Dispatched.', 'Tracking_Number__c', 'VR-Sample-Dispatch-Tracking'),
 ('VR_Dispatch_Requires_Date', 'ISPICKVAL(Status__c, "Dispatched") && ISBLANK(Dispatch_Date__c)',
  'Dispatch date is required when the status is Dispatched.', 'Dispatch_Date__c', 'VR-Sample-Dispatch-Date'),
 ('VR_Feedback_Requires_Text', 'ISPICKVAL(Status__c, "Feedback Received") && ISBLANK(Customer_Feedback__c)',
  'Record the customer feedback before setting the status to Feedback Received.', 'Customer_Feedback__c', 'VR-Sample-Feedback'),
 ('VR_Feedback_Requires_Result', 'ISPICKVAL(Status__c, "Feedback Received") && (ISBLANK(TEXT(Result__c)) || ISPICKVAL(Result__c, "Pending"))',
  'Select the sample result (Approved or Rejected) when feedback is received.', 'Result__c', 'VR-Sample-Result'),
 ('VR_Rejected_Requires_Reason', 'ISPICKVAL(Result__c, "Rejected") && ISBLANK(TEXT(Rejection_Reason__c))',
  'A rejection reason is required when a sample is rejected. The opportunity stays open for the next iteration.', 'Rejection_Reason__c', 'VR-Sample-Rejection'),
 ('VR_Rejected_Requires_Next_Action', 'ISPICKVAL(Result__c, "Rejected") && ISBLANK(Next_Action__c)',
  'Enter the next action (for example: send revised sample with adjusted specification) when a sample is rejected.', 'Next_Action__c', 'VR-Sample-Rejection-Action'),
 ('VR_Approved_Requires_Feedback', 'ISPICKVAL(Result__c, "Approved") && ISBLANK(Customer_Feedback__c)',
  'Record the customer feedback before approving a sample.', 'Customer_Feedback__c', 'VR-Sample-Approved'),
 ('VR_Dispatch_Date_After_Request', 'NOT(ISBLANK(Dispatch_Date__c)) && NOT(ISBLANK(Requested_Date__c)) && Dispatch_Date__c < Requested_Date__c',
  'Dispatch date cannot be earlier than the requested date.', 'Dispatch_Date__c', 'VR-Sample-Dates'),
 ('VR_Quantity_Positive', 'Sample_Quantity__c <= 0', 'Sample quantity must be greater than zero.', 'Sample_Quantity__c', 'VR-Sample-Quantity'),
 ('VR_Closed_Requires_Reason', 'ISPICKVAL(Status__c, "Closed") && ISBLANK(Closure_Reason__c)',
  'Enter a closure reason when closing a sample request without a result.', 'Closure_Reason__c', 'VR-Sample-Closed'),
]

# ================================================================ Competitor_Intel__c
CI = [
 dict(api='Competitor_Name__c', label='Competitor', type='Text', length=100, required=True),
 dict(api='Account__c', label='Account', type='Lookup', referenceTo='Account', relationshipLabel='Competitor Intel', relationshipName='Competitor_Intel'),
 dict(api='Opportunity__c', label='Opportunity', type='Lookup', referenceTo='Opportunity', relationshipLabel='Competitor Intel', relationshipName='Competitor_Intel'),
 dict(api='Product__c', label='Product', type='Lookup', referenceTo='Product2', relationshipLabel='Competitor Intel', relationshipName='Competitor_Intel'),
 dict(api='Quoted_Price__c', label='Competitor Quoted Price', type='Currency', precision=18, scale=2),
 dict(api='Price_Unit__c', label='Price Unit', type='Picklist', values=['per MT', 'per KG'], default='per MT'),
 dict(api='Customer_Preference__c', label='Customer Preference', type='Text', length=255),
 dict(api='Strength__c', label='Strength', type='Text', length=255),
 dict(api='Weakness__c', label='Weakness', type='Text', length=255),
 dict(api='Source__c', label='Source', type='Picklist', values=['Customer Discussion', 'Trade Show', 'Port Data', 'Website', 'LinkedIn', 'Other'], default='Customer Discussion'),
 dict(api='Intel_Date__c', label='Intel Date', type='Date', default='TODAY()'),
 dict(api='Notes__c', label='Notes', type='LongTextArea', length=32768, visibleLines=3),
]

# ================================================================ Customer_Onboarding__c
def item(prefix, label, default_owner):
    return [
        dict(api=f'{prefix}_Status__c', label=f'{label} Status', type='Picklist', values=ITEM_STATUS, default='Pending'),
        dict(api=f'{prefix}_Owner__c', label=f'{label} Owner', type='Picklist', values=ITEM_OWNER, default=default_owner),
    ]
ONB = [
 dict(api='Account__c', label='Account', type='Lookup', referenceTo='Account', relationshipLabel='Customer Onboardings', relationshipName='Customer_Onboardings', required=True, deleteConstraint='Restrict'),
 dict(api='Opportunity__c', label='Opportunity', type='Lookup', referenceTo='Opportunity', relationshipLabel='Customer Onboardings', relationshipName='Customer_Onboardings'),
 dict(api='Status__c', label='Status', type='Picklist', values=['Not Started', 'In Progress', 'Complete', 'On Hold'], default='Not Started', track=True),
 dict(api='Due_Date__c', label='Due Date', type='Date'),
 dict(api='Completed_Date__c', label='Completed Date', type='Date'),
] + item('Company_Information', 'Company Information', 'Sales Admin') + item('Finance', 'Finance', 'Finance') + item('Quality', 'Quality', 'Quality') + item('Logistics', 'Logistics', 'Operations') + item('Compliance', 'Compliance', 'Compliance') + [
 dict(api='Completion_Percent__c', label='Completion %', type='Percent', formulaType='Percent', scale=0,
      formula='(IF(OR(ISPICKVAL(Company_Information_Status__c, "Complete"), ISPICKVAL(Company_Information_Status__c, "Not Required")), 1, 0) + '
              'IF(OR(ISPICKVAL(Finance_Status__c, "Complete"), ISPICKVAL(Finance_Status__c, "Not Required")), 1, 0) + '
              'IF(OR(ISPICKVAL(Quality_Status__c, "Complete"), ISPICKVAL(Quality_Status__c, "Not Required")), 1, 0) + '
              'IF(OR(ISPICKVAL(Logistics_Status__c, "Complete"), ISPICKVAL(Logistics_Status__c, "Not Required")), 1, 0) + '
              'IF(OR(ISPICKVAL(Compliance_Status__c, "Complete"), ISPICKVAL(Compliance_Status__c, "Not Required")), 1, 0)) / 5 * 100'),
 dict(api='Notes__c', label='Notes', type='LongTextArea', length=32768, visibleLines=3, help='DEMO / TO VALIDATE: exact statutory documents per checklist area are to be confirmed by Apex.'),
]

# ================================================================ Integration_Log__c
IL = [
 dict(api='Order__c', label='Order', type='Lookup', referenceTo='Order', relationshipLabel='Integration Logs', relationshipName='Integration_Logs'),
 dict(api='Opportunity__c', label='Opportunity', type='Lookup', referenceTo='Opportunity', relationshipLabel='Integration Logs', relationshipName='Integration_Logs'),
 dict(api='Record_Type_Name__c', label='Record Type', type='Text', length=50, help='Salesforce object that was sent (for example Order).'),
 dict(api='Salesforce_Record_Id__c', label='Salesforce Record Id', type='Text', length=18),
 dict(api='Target_System__c', label='Target System', type='Text', length=50, default='"SAP ERP"'),
 dict(api='Direction__c', label='Direction', type='Picklist', values=['Outbound', 'Inbound'], default='Outbound'),
 dict(api='Integration_Mode__c', label='Integration Mode (DEMO)', type='Picklist', values=['Mock (Demo)', 'Live'], default='Mock (Demo)'),
 dict(api='Status__c', label='Status', type='Picklist', values=['Not Sent', 'Sent', 'Acknowledged', 'Error', 'Mock'], default='Mock'),
 dict(api='Payload_Summary__c', label='Payload Summary', type='LongTextArea', length=32768, visibleLines=5),
 dict(api='Sent_Date_Time__c', label='Sent Date/Time', type='DateTime'),
 dict(api='Response_Summary__c', label='Response Summary', type='LongTextArea', length=32768, visibleLines=5),
 dict(api='Error_Message__c', label='Error Message', type='Text', length=255),
 dict(api='Retry_Count__c', label='Retry Count', type='Number', precision=3, scale=0, default='0'),
]

# ================================================================ Apex_Demo_Setting__mdt
MDT = [
 dict(api='Discount_Threshold_Percent__c', label='Discount Threshold % (DEMO)', type='MetadataNumber', precision=5, scale=2, description='DEMO / TO VALIDATE. Quotes with a discount above this percentage are routed for approval.'),
 dict(api='Stale_Opportunity_Days__c', label='Stale Opportunity Days', type='MetadataNumber', precision=5, scale=0),
 dict(api='Reorder_Lead_Days__c', label='Reorder Follow-up Lead Days', type='MetadataNumber', precision=5, scale=0),
 dict(api='Default_Reorder_Interval_Days__c', label='Default Reorder Interval Days', type='MetadataNumber', precision=5, scale=0),
 dict(api='Default_Close_Days__c', label='Default Opportunity Close Days (DEMO)', type='MetadataNumber', precision=5, scale=0, description='DEMO / TO VALIDATE. Used only to default the Close Date of an opportunity created from a sample request.'),
 dict(api='Feedback_Follow_Up_Days__c', label='Sample Feedback Follow-up Days', type='MetadataNumber', precision=5, scale=0),
 dict(api='Sample_Approval_Quantity_Limit_KG__c', label='Sample Approval Quantity Limit (KG)', type='MetadataNumber', precision=10, scale=2, description='DEMO / TO VALIDATE. New sample requests above this quantity go to Approval Pending.'),
 dict(api='Management_Approver_Username__c', label='Management Approver Username', type='MetadataText', length=255, description='Username of the Management approver for quotes. Blank = fall back to the owner\'s manager chain.'),
]

# ================================================================ Opportunity
OPP = [
 dict(api='Opportunity_Type__c', label='Opportunity Type', type='Picklist', values=['New Business', 'Repeat', 'Upsell', 'Cross-sell'], default='New Business'),
 dict(api='Primary_Product__c', label='Primary Product', type='Lookup', referenceTo='Product2', relationshipLabel='Opportunities (Primary Product)', relationshipName='Primary_Product_Opportunities'),
 dict(api='Expected_Annual_Volume__c', label='Expected Annual Volume', type='Number', precision=16, scale=2),
 dict(api='Volume_Unit__c', label='Volume Unit', type='Picklist', values=VOLUME_UNITS, default='MT'),
 dict(api='Purchase_Timeline__c', label='Purchase Timeline', type='Picklist', values=TIMELINES, inactive=['<3 Months', '3-6 Months', '6-12 Months', '>12 Months']),
 dict(api='Current_Supplier__c', label='Current Supplier', type='Text', length=100),
 dict(api='Competitor__c', label='Competitor', type='Text', length=100),
 dict(api='Sample_Approved_Date__c', label='Sample Approved Date', type='Date', help='Set automatically when a linked sample request is approved.'),
 dict(api='Technical_Evaluation_Status__c', label='Technical Evaluation Status', type='Picklist', values=['Pending', 'In Progress', 'Complete']),
 dict(api='Customer_Approval_Date__c', label='Customer Approval Date', type='Date'),
 dict(api='PO_Number__c', label='PO Number', type='Text', length=50),
 dict(api='PO_Date__c', label='PO Date', type='Date'),
 dict(api='PO_Quantity__c', label='PO Quantity', type='Number', precision=16, scale=2),
 dict(api='Loss_Reason__c', label='Loss Reason', type='Picklist', values=['Price', 'Sample Rejected', 'Competitor Selected', 'No Requirement', 'Timing', 'Specification', 'Other']),
 dict(api='Loss_Details__c', label='Loss Details', type='LongTextArea', length=32768, visibleLines=3, help='Context for re-engagement later.'),
 dict(api='Next_Action__c', label='Next Action', type='Text', length=255),
 dict(api='Next_Action_Date__c', label='Next Action Date', type='Date'),
 dict(api='Sample_Request_Count__c', label='Sample Requests', type='Number', precision=3, scale=0, default='0', help='Maintained by flow.'),
 dict(api='Latest_Sample_Status__c', label='Latest Sample Status', type='Text', length=255, help='Maintained by flow.'),
 dict(api='Quote_Count__c', label='Quotes', type='Number', precision=3, scale=0, default='0', help='Maintained by flow.'),
 dict(api='Latest_Quote_Price__c', label='Latest Quote Price', type='Currency', precision=18, scale=2, help='Maintained by flow from the most recent quote line.'),
 dict(api='Days_Since_Last_Activity__c', label='Days Since Last Activity', type='Number', formulaType='Number', scale=0, blanks='BlankAsZero',
      formula='TODAY() - BLANKVALUE(LastActivityDate, DATEVALUE(CreatedDate))'),
 dict(api='Is_Stale__c', label='Is Stale', type='Checkbox', formulaType='Checkbox',
      formula=f'NOT(IsClosed) && (TODAY() - BLANKVALUE(LastActivityDate, DATEVALUE(CreatedDate))) > {CMDT}Stale_Opportunity_Days__c'),
]
OPP_VRS = [
 ('VR_Sample_Requested_Needs_Sample', 'NOT(ISNEW()) && ISCHANGED(StageName) && ISPICKVAL(StageName, "Sample Requested") && Sample_Request_Count__c = 0',
  'Create a Sample Request for this opportunity before setting the stage to Sample Requested.', 'StageName', 'Stage = Sample Requested requires at least one Sample Request.'),
 ('VR_Later_Stages_Need_Approved_Sample',
  'ISPICKVAL(Opportunity_Type__c, "New Business") && ISBLANK(Sample_Approved_Date__c) && CASE(TEXT(StageName), "Sample Approved", 1, "Technical Evaluation", 1, "Pricing Discussion", 1, "Quotation Sent", 1, "Negotiation", 1, "Customer Approval", 1, "PO Received", 1, "Closed Won", 1, 0) = 1',
  'A new-business opportunity needs an approved Sample Request before it can move past Sample Testing. Approve the sample first (the Sample Approved Date is set automatically).', 'StageName', 'Stage = Sample Approved (and later) requires an approved Sample Request.'),
 ('VR_Technical_Evaluation_Needs_Status', 'ISPICKVAL(StageName, "Technical Evaluation") && ISBLANK(TEXT(Technical_Evaluation_Status__c))',
  'Set the Technical Evaluation Status when the opportunity is in Technical Evaluation.', 'Technical_Evaluation_Status__c', None),
 ('VR_Quotation_Stages_Need_Quote', 'CASE(TEXT(StageName), "Quotation Sent", 1, "Negotiation", 1, "Customer Approval", 1, 0) = 1 && Quote_Count__c = 0',
  'Create a Quote for this opportunity before moving to Quotation Sent, Negotiation or Customer Approval.', 'StageName', None),
 ('VR_PO_Received_Needs_PO', 'CASE(TEXT(StageName), "PO Received", 1, "Closed Won", 1, 0) = 1 && (ISBLANK(PO_Number__c) || ISBLANK(PO_Date__c))',
  'PO Number and PO Date are required for PO Received and Closed Won.', 'PO_Number__c', None),
 ('VR_Closed_Lost_Needs_Reason', 'ISPICKVAL(StageName, "Closed Lost") && ISBLANK(TEXT(Loss_Reason__c))',
  'Select a Loss Reason before closing the opportunity as lost, so the relationship can be re-engaged later.', 'Loss_Reason__c', None),
]

# ================================================================ Account
ACC = [
 dict(api='Customer_Type__c', label='Customer Type', type='Picklist', values=CUSTOMER_TYPES, inactive=['Direct Customer', 'Brand', 'Private Label', 'Distributor/Other']),
 dict(api='Business_Type__c', label='Business Type', type='Text', length=100),
 dict(api='Market__c', label='Market', type='Picklist', values=['India', 'Export']),
 dict(api='Onboarding_Status__c', label='Onboarding Status', type='Picklist', values=['Not Started', 'In Progress', 'Complete', 'On Hold'], help='Maintained by flow from the Customer Onboarding record.'),
 dict(api='Last_Purchase_Date__c', label='Last Purchase Date', type='Date', help='Maintained by flow when an order is activated.'),
 dict(api='Last_Order_Value__c', label='Last Order Value', type='Currency', precision=18, scale=2),
 dict(api='Last_Purchased_Product__c', label='Last Purchased Product', type='Lookup', referenceTo='Product2', relationshipLabel='Accounts (Last Purchased)', relationshipName='Last_Purchased_Accounts'),
 dict(api='Average_Reorder_Interval_Days__c', label='Average Reorder Interval (Days)', type='Number', precision=5, scale=0, help='DEMO / TO VALIDATE: interval between the two most recent activated orders.'),
 dict(api='Expected_Reorder_Date__c', label='Expected Reorder Date', type='Date'),
 dict(api='Orders_Last_12_Months__c', label='Orders (Last 12 Months)', type='Number', precision=5, scale=0),
 dict(api='Reorder_Status__c', label='Reorder Status', type='Text', formulaType='Text',
      formula=f'IF(ISBLANK(Expected_Reorder_Date__c), "No Orders", IF(Expected_Reorder_Date__c < TODAY(), "Overdue", IF(Expected_Reorder_Date__c - TODAY() <= {CMDT}Reorder_Lead_Days__c, "Due", "On Track")))'),
]

# ================================================================ Quote / QuoteLineItem
QUOTE = [
 dict(api='Quote_Version__c', label='Quote Version', type='Number', precision=3, scale=0, default='1'),
 dict(api='Previous_Quote__c', label='Previous Quote Version', type='Lookup', referenceTo='Quote', relationshipLabel='Revisions', relationshipName='Revisions'),
 dict(api='Revision_Reason__c', label='Revision Reason', type='Text', length=255),
 dict(api='Quote_Date__c', label='Quote Date', type='Date', help='Defaults to the creation date; editable for historical demo data.'),
 dict(api='Payment_Terms__c', label='Payment Terms (DEMO)', type='Picklist', values=['30% Advance / 70% against BL', 'LC at Sight', 'TT 30 Days', 'TT 60 Days', 'Other'], help='DEMO / TO VALIDATE with Apex.'),
 dict(api='Delivery_Terms__c', label='Delivery Terms (DEMO)', type='Picklist', values=['FOB', 'CIF', 'CFR', 'EXW', 'DDP', 'Other'], help='DEMO / TO VALIDATE with Apex.'),
 dict(api='Competitor_Name__c', label='Competitor', type='Text', length=100),
 dict(api='Competitor_Price__c', label='Competitor Price', type='Currency', precision=18, scale=2),
 dict(api='Approval_Status__c', label='Approval Status', type='Picklist', values=['Not Required', 'Pending Approval', 'Approved', 'Rejected'], default='Not Required'),
 dict(api='Requires_Approval__c', label='Requires Approval', type='Checkbox', formulaType='Checkbox',
      formula='BLANKVALUE(Discount, 0) > 5', help='DEMO / TO VALIDATE: discount above 5% needs approval. Keep in step with Apex Demo Setting.Discount Threshold % (used by the flows).'),
 dict(api='Sales_Manager_Approver__c', label='Sales Manager Approver', type='Lookup', referenceTo='User', relationshipLabel='Quotes (Sales Manager Approver)', relationshipName='Sales_Manager_Approval_Quotes', help='Set automatically by flow: owner\'s manager, or the owner when no manager is set.'),
 dict(api='Management_Approver__c', label='Management Approver', type='Lookup', referenceTo='User', relationshipLabel='Quotes (Management Approver)', relationshipName='Management_Approval_Quotes', help='Set automatically by flow from the Apex Demo Setting or the manager chain.'),
 dict(api='Total_Cost__c', label='Total Cost (DEMO)', type='Summary', summarizedField='QuoteLineItem.Line_Cost__c', summaryForeignKey='QuoteLineItem.QuoteId', summaryOperation='sum'),
 dict(api='Total_Margin__c', label='Total Margin (DEMO)', type='Currency', formulaType='Currency', scale=2, blanks='BlankAsZero', formula='TotalPrice - Total_Cost__c'),
 dict(api='Margin_Percent__c', label='Margin % (DEMO)', type='Percent', formulaType='Percent', scale=1, blanks='BlankAsZero', formula='IF(TotalPrice > 0, (TotalPrice - Total_Cost__c) / TotalPrice * 100, 0)'),
]
QUOTE_VRS = [
 ('VR_Sent_Requires_Approval', 'AND(OR(ISPICKVAL(Status, "Sent"), ISPICKVAL(Status, "Presented"), ISPICKVAL(Status, "Accepted")), BLANKVALUE(Discount, 0) > 5, NOT(ISPICKVAL(Approval_Status__c, "Approved")))',
  'This quote exceeds the discount threshold and must be approved before it is sent or accepted. Use Submit for Approval.', 'Status', None),
]
QLI = [
 dict(api='Account__c', label='Account', type='Lookup', referenceTo='Account', relationshipLabel='Quote Line Items', relationshipName='Quote_Line_Items', help='Set by flow from the quote, so price history can be reported per customer and product.'),
 dict(api='Unit_Cost__c', label='Unit Cost (DEMO)', type='Currency', precision=18, scale=2, help='DEMO / TO VALIDATE: defaults from Product Standard Cost.'),
 dict(api='Line_Cost__c', label='Line Cost (DEMO)', type='Currency', precision=18, scale=2, help='Unit Cost x Quantity. Maintained by flow.'),
 dict(api='Margin_Percent__c', label='Margin % (DEMO)', type='Percent', formulaType='Percent', scale=1, blanks='BlankAsZero', formula='IF(UnitPrice > 0, (UnitPrice - BLANKVALUE(Unit_Cost__c, 0)) / UnitPrice * 100, 0)'),
 dict(api='Last_Quoted_Price__c', label='Last Price to This Customer', type='Currency', precision=18, scale=2, help='Previous quoted unit price for the same account and product. Set by flow.'),
 dict(api='Last_Quoted_Date__c', label='Last Quoted Date', type='Date'),
 dict(api='Supply_Period_From__c', label='Supply Period From', type='Date'),
 dict(api='Supply_Period_To__c', label='Supply Period To', type='Date'),
]

# ================================================================ Order / Case / Product2 / User
ORDER = [
 dict(api='SAP_Status__c', label='SAP Status (DEMO)', type='Picklist', values=['Not Sent', 'Sent', 'Acknowledged', 'In Production', 'Dispatched', 'Invoiced', 'Error'], default='Not Sent', help='Simulated. Real SAP integration is Phase 2.'),
 dict(api='SAP_Order_Number__c', label='SAP Sales Order No. (DEMO)', type='Text', length=20),
 dict(api='SAP_Invoice_Number__c', label='SAP Invoice No. (DEMO)', type='Text', length=20),
 dict(api='SAP_Sent_Date_Time__c', label='SAP Sent Date/Time', type='DateTime'),
 dict(api='SAP_Last_Response__c', label='SAP Last Response (DEMO)', type='Text', length=255),
 dict(api='Integration_Mode__c', label='Integration Mode (DEMO)', type='Picklist', values=['Mock (Demo)', 'Live'], default='Mock (Demo)'),
]
CASE = [
 dict(api='Complaint_Type__c', label='Complaint Type', type='Picklist', values=['Quality', 'Packaging', 'Quantity Shortage', 'Delivery Delay', 'Documentation', 'Other']),
 dict(api='Complaint_Product__c', label='Product', type='Lookup', referenceTo='Product2', relationshipLabel='Cases', relationshipName='Cases'),
 dict(api='Batch_Number__c', label='Batch Number', type='Text', length=50),
 dict(api='Order__c', label='Order', type='Lookup', referenceTo='Order', relationshipLabel='Cases', relationshipName='Cases'),
 dict(api='Resolution__c', label='Resolution', type='LongTextArea', length=32768, visibleLines=3),
]
PRODUCT = [
 dict(api='Standard_Cost__c', label='Standard Cost per Unit (DEMO)', type='Currency', precision=18, scale=2, help='DEMO / TO VALIDATE: margin source to be confirmed by Apex.'),
 dict(api='Unit_of_Measure__c', label='Unit of Measure', type='Text', length=10, default='"MT"'),
]

# ================================================================ Lead (shared contract, Person 1 owns; API names from Apex_Coco_Salesforce_Lead_Object_Fields.xlsx)
COUNTRIES = ['India', 'United States', 'United Kingdom', 'Germany', 'Netherlands', 'France', 'Italy', 'Spain', 'Sweden', 'Poland', 'United Arab Emirates', 'Saudi Arabia', 'Turkey', 'South Africa', 'Egypt', 'Australia', 'New Zealand', 'Japan', 'South Korea', 'China', 'Singapore', 'Malaysia', 'Vietnam', 'Canada', 'Brazil', 'Mexico', 'Other']
COMPANY_TYPES = ['Importer', 'Brand Owner', 'Manufacturer', 'Distributor', 'Trader', 'Retailer']
LEAD_CUSTOMER_TYPES = COMPANY_TYPES + ['Private Label Customer', 'B2C Customer']
LEAD_TIMELINES = ['Immediate', '3 Months', '6 Months', '12 Months', 'Long Term']
LEAD = [
 dict(api='Lead_Number__c', label='Lead Number', type='AutoNumber', displayFormat='L-{00000}', description='Unique lead reference'),
 dict(api='Campaign__c', label='Campaign Name', type='Lookup', referenceTo='Campaign', relationshipLabel='Leads (Campaign)', relationshipName='Apex_Leads', description='Track exhibition/campaign'),
 dict(api='Event_Name__c', label='Event Name', type='Text', length=255, description='Trade show/event name'),
 dict(api='LinkedIn_Profile__c', label='LinkedIn Profile', type='Url', description='Research information'),
 dict(api='Country__c', label='Country', type='Picklist', values=COUNTRIES, description='Customer geography (values: DEMO list, extend as needed)'),
 dict(api='Company_Type__c', label='Company Type', type='Picklist', values=COMPANY_TYPES, description='Business classification'),
 dict(api='Employee_Count__c', label='Employee Count', type='Number', precision=18, scale=0, description='Company size'),
 dict(api='Customer_Type__c', label='Customer Type', type='Picklist', values=LEAD_CUSTOMER_TYPES, description='Customer segment'),
 dict(api='Business_Model__c', label='Business Model', type='Picklist', values=['Bulk Ingredient Buyer', 'Private Label', 'Own Brand Distribution', 'Manufacturing Partner'], description='Business model'),
 dict(api='Potential_Category__c', label='Potential Category', type='Picklist', values=['High', 'Medium', 'Low'], description='Business potential'),
 dict(api='Buying_Intent__c', label='Buying Intent', type='Picklist', values=['Immediate Purchase', 'Future Requirement', 'R&D Evaluation', 'Price Comparison', 'Existing Supplier Review', 'Information Gathering'], description='Buying stage'),
 dict(api='Purchase_Timeline__c', label='Purchase Timeline', type='Picklist', values=LEAD_TIMELINES, description='Expected buying timeline'),
 dict(api='Estimated_Annual_Volume__c', label='Estimated Annual Volume', type='Number', precision=16, scale=2, description='Potential volume (MT)'),
 dict(api='Expected_Monthly_Volume__c', label='Expected Monthly Volume', type='Number', precision=16, scale=2, description='Monthly requirement (MT)'),
 dict(api='Interested_Product__c', label='Interested Product', type='MultiselectPicklist', values=['Coconut Milk Powder', 'Coconut Cream', 'Desiccated Coconut', 'Coconut Water', 'Coconut Oil', 'Other'], description='Product interest'),
 dict(api='Application_Usage__c', label='Application / Usage', type='LongTextArea', length=32768, visibleLines=3, description='End use'),
 dict(api='Lead_Classification__c', label='Lead Classification', type='Picklist', values=['Potential Customer', 'Competitor', 'Price Collector', 'Existing Supplier Customer', 'Unknown', 'Junk Lead'], description='Research outcome'),
 dict(api='Research_Completed__c', label='Research Completed', type='Checkbox', default='false', description='Research status'),
 dict(api='Research_Notes__c', label='Research Notes', type='LongTextArea', length=32768, visibleLines=3, description='Research comments'),
 dict(api='Current_Supplier__c', label='Current Supplier', type='Text', length=255, description='Existing supplier'),
 dict(api='Competitor__c', label='Competitor Name', type='Lookup', referenceTo='Competitor__c', relationshipLabel='Leads', relationshipName='Leads', description='Competitor mapping'),
 dict(api='Reason_for_Switching__c', label='Reason for Switching', type='Picklist', values=['Price', 'Quality Issues', 'Supply Reliability', 'Lead Time', 'Certification / Compliance', 'Product Range', 'Payment Terms', 'Other'], description='Customer motivation (values: DEMO list, validate with Apex)'),
 dict(api='WhatsApp_Number__c', label='WhatsApp Number', type='Phone', description='Communication'),
 dict(api='Designation__c', label='Designation', type='Text', length=255, description='Contact role'),
 dict(api='Last_Contact_Date__c', label='Last Contact Date', type='Date', description='Last interaction'),
 dict(api='Next_Followup_Date__c', label='Next Follow-up Date', type='Date', description='Reminder'),
 dict(api='Preferred_Communication__c', label='Preferred Communication', type='Picklist', values=['Email', 'Phone', 'WhatsApp', 'Meeting'], description='Channel preference'),
 dict(api='Customer_Response__c', label='Customer Response', type='Picklist', values=['Interested', 'Not Interested', 'Future Requirement', 'Waiting Approval', 'Requested Sample', 'Requested Quote', 'No Response'], description='Response tracking'),
 dict(api='Sample_Requested__c', label='Sample Requested', type='Checkbox', default='false', description='Opportunity trigger'),
 dict(api='Sample_Request_Date__c', label='Sample Request Date', type='Date', description='Sample timeline'),
 dict(api='Sample_Product__c', label='Sample Product', type='Text', length=255, description='Sample requirement'),
 dict(api='Decision_Maker_Identified__c', label='Decision Maker Identified', type='Checkbox', default='false', description='Qualification'),
 dict(api='Product_Requirement_Confirmed__c', label='Product Requirement Confirmed', type='Checkbox', default='false', description='Qualification'),
 dict(api='AI_Lead_Score__c', label='AI Lead Score', type='Number', precision=3, scale=0, description='AI prioritization'),
 dict(api='Lead_Health__c', label='Lead Health', type='Picklist', values=['High', 'Medium', 'Low'], description='AI insight'),
 dict(api='AI_Insights__c', label='AI Insights', type='LongTextArea', length=32768, visibleLines=4, description='Generated recommendation'),
]
COMPETITOR = [
 dict(api='Website__c', label='Website', type='Url'),
 dict(api='Country__c', label='Country', type='Picklist', values=COUNTRIES),
 dict(api='Strength__c', label='Strength', type='Text', length=255),
 dict(api='Weakness__c', label='Weakness', type='Text', length=255),
 dict(api='Notes__c', label='Notes', type='LongTextArea', length=32768, visibleLines=3),
]

# ---------------------------------------------------------------- write everything
def main():
    # Sample_Request__c
    base = os.path.join(FA, 'objects', 'Sample_Request__c')
    w(os.path.join(base, 'Sample_Request__c.object-meta.xml'), custom_object_xml(
        'Sample Request', 'Sample Requests', 'Sample Request Number', autonumber='SMPREQ-{0000}', compact='Apex_Sample_Request_Compact',
        description='Apex Coco sample lifecycle. Person 2 workstream. Tracks every sample iteration linked to the commercial Opportunity.',
        action_page='Apex_Sample_Request_Record_Page'))
    write_fields(FA, 'Sample_Request__c', SR, track_history=True)
    for name, formula, msg, fld, desc in SR_VRS:
        w(os.path.join(base, 'validationRules', f'{name}.validationRule-meta.xml'), vr_xml(name, formula, msg, fld, desc))
    w(os.path.join(base, 'compactLayouts', 'Apex_Sample_Request_Compact.compactLayout-meta.xml'), compact_xml(
        'Apex_Sample_Request_Compact', 'Apex Sample Request Compact', ['Name', 'Status__c', 'Product__c', 'Iteration_Number__c', 'Result__c', 'Tracking_Number__c', 'Next_Action__c']))
    cols = ['NAME', 'Account__c', 'Product__c', 'Iteration_Number__c', 'Status__c', 'Result__c', 'Requested_Date__c', 'Dispatch_Date__c', 'Tracking_Number__c', 'Next_Action__c']
    w(os.path.join(base, 'listViews', 'All.listView-meta.xml'), listview_xml('All', 'All Sample Requests', cols))
    w(os.path.join(base, 'listViews', 'Sales_Admin_Preparation_Queue.listView-meta.xml'), listview_xml(
        'Sales_Admin_Preparation_Queue', 'Sales Admin - To Prepare / Dispatch', cols, [('Status__c', 'equals', 'Requested,Approval Pending,Prepared')]))
    w(os.path.join(base, 'listViews', 'Awaiting_Customer_Feedback.listView-meta.xml'), listview_xml(
        'Awaiting_Customer_Feedback', 'Awaiting Customer Feedback', cols + ['Days_Pending_Feedback__c'], [('Status__c', 'equals', 'Dispatched,Customer Testing')]))
    w(os.path.join(base, 'listViews', 'Rejected_Needs_Iteration.listView-meta.xml'), listview_xml(
        'Rejected_Needs_Iteration', 'Rejected - Next Iteration Due', cols + ['Rejection_Reason__c'], [('Result__c', 'equals', 'Rejected')]))
    w(os.path.join(base, 'listViews', 'Open_Sample_Aging.listView-meta.xml'), listview_xml(
        'Open_Sample_Aging', 'Open Samples - Aging', ['NAME', 'Account__c', 'Status__c', 'Requested_Date__c', 'Days_Since_Request__c', 'Days_Pending_Feedback__c', 'OWNER.ALIAS'], [('Is_Open__c', 'equals', '1')]))

    # Competitor_Intel__c
    base = os.path.join(FA, 'objects', 'Competitor_Intel__c')
    w(os.path.join(base, 'Competitor_Intel__c.object-meta.xml'), custom_object_xml('Competitor Intel', 'Competitor Intel', 'Intel Number', autonumber='CI-{0000}', compact='Apex_Competitor_Intel_Compact',
        description='Competitor pricing and feedback captured on the customer relationship and opportunity.'))
    write_fields(FA, 'Competitor_Intel__c', CI, track_history=True)
    w(os.path.join(base, 'compactLayouts', 'Apex_Competitor_Intel_Compact.compactLayout-meta.xml'), compact_xml('Apex_Competitor_Intel_Compact', 'Apex Competitor Intel Compact', ['Name', 'Competitor_Name__c', 'Quoted_Price__c', 'Account__c', 'Product__c']))
    w(os.path.join(base, 'listViews', 'All.listView-meta.xml'), listview_xml('All', 'All Competitor Intel', ['NAME', 'Competitor_Name__c', 'Account__c', 'Opportunity__c', 'Product__c', 'Quoted_Price__c', 'Customer_Preference__c', 'Source__c', 'Intel_Date__c']))

    # Customer_Onboarding__c
    base = os.path.join(FA, 'objects', 'Customer_Onboarding__c')
    w(os.path.join(base, 'Customer_Onboarding__c.object-meta.xml'), custom_object_xml('Customer Onboarding', 'Customer Onboardings', 'Onboarding Number', autonumber='ONB-{0000}', compact='Apex_Customer_Onboarding_Compact',
        description='Lightweight onboarding checklist after customer approval. Checklist areas are DEMO placeholders to validate with Apex.'))
    write_fields(FA, 'Customer_Onboarding__c', ONB, track_history=True)
    w(os.path.join(base, 'compactLayouts', 'Apex_Customer_Onboarding_Compact.compactLayout-meta.xml'), compact_xml('Apex_Customer_Onboarding_Compact', 'Apex Customer Onboarding Compact', ['Name', 'Account__c', 'Status__c', 'Completion_Percent__c', 'Due_Date__c']))
    w(os.path.join(base, 'listViews', 'All.listView-meta.xml'), listview_xml('All', 'All Onboardings', ['NAME', 'Account__c', 'Opportunity__c', 'Status__c', 'Completion_Percent__c', 'Due_Date__c']))
    w(os.path.join(base, 'listViews', 'Open_Onboardings.listView-meta.xml'), listview_xml('Open_Onboardings', 'Open Onboardings', ['NAME', 'Account__c', 'Status__c', 'Completion_Percent__c', 'Due_Date__c'], [('Status__c', 'notEqual', 'Complete')]))

    # Integration_Log__c
    base = os.path.join(FA, 'objects', 'Integration_Log__c')
    w(os.path.join(base, 'Integration_Log__c.object-meta.xml'), custom_object_xml('Integration Log', 'Integration Logs', 'Integration Id', autonumber='INT-{00000}', history=False, activities=False, compact='Apex_Integration_Log_Compact',
        description='DEMO ONLY: audit trail of the simulated Salesforce -> SAP handoff. No live SAP connection.'))
    write_fields(FA, 'Integration_Log__c', IL)
    w(os.path.join(base, 'compactLayouts', 'Apex_Integration_Log_Compact.compactLayout-meta.xml'), compact_xml('Apex_Integration_Log_Compact', 'Apex Integration Log Compact', ['Name', 'Direction__c', 'Status__c', 'Target_System__c', 'Sent_Date_Time__c']))
    w(os.path.join(base, 'listViews', 'All.listView-meta.xml'), listview_xml('All', 'All Integration Logs', ['NAME', 'Order__c', 'Direction__c', 'Status__c', 'Integration_Mode__c', 'Sent_Date_Time__c', 'Response_Summary__c']))

    # Custom metadata type
    base = os.path.join(FA, 'objects', 'Apex_Demo_Setting__mdt')
    w(os.path.join(base, 'Apex_Demo_Setting__mdt.object-meta.xml'), HDR + f'<CustomObject xmlns="{NS}">\n    <description>Configurable DEMO thresholds for the Apex Person 2 build. Every value is marked DEMO / TO VALIDATE with Apex.</description>\n    <label>Apex Demo Setting</label>\n    <pluralLabel>Apex Demo Settings</pluralLabel>\n    <visibility>Public</visibility>\n</CustomObject>\n')
    write_fields(FA, 'Apex_Demo_Setting__mdt', MDT)

    # Opportunity
    base = os.path.join(FA, 'objects', 'Opportunity')
    w(os.path.join(base, 'Opportunity.object-meta.xml'), standard_object_xml('Apex_Opportunity_Record_Page', 'Apex_Opportunity_Compact'))
    write_fields(FA, 'Opportunity', OPP)
    for name, formula, msg, fld, desc in OPP_VRS:
        w(os.path.join(base, 'validationRules', f'{name}.validationRule-meta.xml'), vr_xml(name, formula, msg, fld, desc))
    w(os.path.join(base, 'compactLayouts', 'Apex_Opportunity_Compact.compactLayout-meta.xml'), compact_xml('Apex_Opportunity_Compact', 'Apex Opportunity Compact', ['Name', 'AccountId', 'StageName', 'Amount', 'Primary_Product__c', 'Expected_Annual_Volume__c', 'Latest_Sample_Status__c', 'Latest_Quote_Price__c', 'Next_Action__c', 'CloseDate']))
    w(os.path.join(base, 'listViews', 'Apex_Open_Pipeline.listView-meta.xml'), listview_xml('Apex_Open_Pipeline', 'Apex Open Pipeline', ['OPPORTUNITY.NAME', 'ACCOUNT.NAME', 'OPPORTUNITY.STAGE_NAME', 'OPPORTUNITY.AMOUNT', 'Primary_Product__c', 'Expected_Annual_Volume__c', 'Latest_Sample_Status__c', 'OPPORTUNITY.CLOSE_DATE', 'CORE.USERS.ALIAS'], [('OPPORTUNITY.CLOSED', 'equals', '0')]))
    w(os.path.join(base, 'listViews', 'Apex_Stale_Opportunities.listView-meta.xml'), listview_xml('Apex_Stale_Opportunities', 'Apex Stale Opportunities', ['OPPORTUNITY.NAME', 'ACCOUNT.NAME', 'OPPORTUNITY.STAGE_NAME', 'Days_Since_Last_Activity__c', 'Next_Action__c', 'CORE.USERS.ALIAS'], [('Is_Stale__c', 'equals', '1')]))

    # Account
    base = os.path.join(FA, 'objects', 'Account')
    w(os.path.join(base, 'Account.object-meta.xml'), standard_object_xml('Apex_Account_Record_Page', 'Apex_Account_Compact'))
    write_fields(FA, 'Account', ACC)
    w(os.path.join(base, 'compactLayouts', 'Apex_Account_Compact.compactLayout-meta.xml'), compact_xml('Apex_Account_Compact', 'Apex Account Compact', ['Name', 'Customer_Type__c', 'Industry', 'Market__c', 'Last_Purchase_Date__c', 'Expected_Reorder_Date__c', 'Reorder_Status__c', 'Onboarding_Status__c']))
    w(os.path.join(base, 'listViews', 'Apex_Reorder_Due.listView-meta.xml'), listview_xml('Apex_Reorder_Due', 'Apex Customers - Reorder Due / Overdue', ['ACCOUNT.NAME', 'Customer_Type__c', 'ACCOUNT.ADDRESS1_COUNTRY', 'Last_Purchase_Date__c', 'Average_Reorder_Interval_Days__c', 'Expected_Reorder_Date__c', 'Reorder_Status__c'], [('Reorder_Status__c', 'equals', 'Due,Overdue')]))

    # Quote / QuoteLineItem
    base = os.path.join(FA, 'objects', 'Quote')
    w(os.path.join(base, 'Quote.object-meta.xml'), standard_object_xml('Apex_Quote_Record_Page', 'Apex_Quote_Compact'))
    write_fields(FA, 'Quote', QUOTE)
    for name, formula, msg, fld, desc in QUOTE_VRS:
        w(os.path.join(base, 'validationRules', f'{name}.validationRule-meta.xml'), vr_xml(name, formula, msg, fld, desc))
    w(os.path.join(base, 'compactLayouts', 'Apex_Quote_Compact.compactLayout-meta.xml'), compact_xml('Apex_Quote_Compact', 'Apex Quote Compact', ['Name', 'QuoteNumber', 'Quote_Version__c', 'Status', 'TotalPrice', 'Discount', 'Margin_Percent__c', 'Approval_Status__c', 'ExpirationDate']))
    write_fields(FA, 'QuoteLineItem', QLI)

    # Order / Case / Product2 / User
    base = os.path.join(FA, 'objects', 'Order')
    w(os.path.join(base, 'Order.object-meta.xml'), standard_object_xml('Apex_Order_Record_Page', 'Apex_Order_Compact'))
    write_fields(FA, 'Order', ORDER)
    w(os.path.join(base, 'compactLayouts', 'Apex_Order_Compact.compactLayout-meta.xml'), compact_xml('Apex_Order_Compact', 'Apex Order Compact', ['OrderNumber', 'AccountId', 'PoNumber', 'Status', 'TotalAmount', 'SAP_Status__c', 'SAP_Order_Number__c', 'SAP_Invoice_Number__c']))
    write_fields(FA, 'Case', CASE)
    write_fields(FA, 'Product2', PRODUCT)
    write_fields(SHARED, 'Lead', LEAD)
    base = os.path.join(SHARED, 'objects', 'Competitor__c')
    w(os.path.join(base, 'Competitor__c.object-meta.xml'), custom_object_xml('Competitor', 'Competitors', 'Competitor Name', history=False, compact=None,
        description='Competitor master referenced by Lead.Competitor__c (shared Lead contract).'))
    write_fields(SHARED, 'Competitor__c', COMPETITOR)
    w(os.path.join(base, 'listViews', 'All.listView-meta.xml'), listview_xml('All', 'All Competitors', ['NAME', 'Country__c', 'Website__c', 'Strength__c', 'Weakness__c']))

    # Field inventory for permission sets / docs
    inv = {
        'Sample_Request__c': [f['api'] for f in SR], 'Competitor_Intel__c': [f['api'] for f in CI], 'Customer_Onboarding__c': [f['api'] for f in ONB],
        'Integration_Log__c': [f['api'] for f in IL], 'Opportunity': [f['api'] for f in OPP], 'Account': [f['api'] for f in ACC], 'Quote': [f['api'] for f in QUOTE],
        'QuoteLineItem': [f['api'] for f in QLI], 'Order': [f['api'] for f in ORDER], 'Case': [f['api'] for f in CASE], 'Product2': [f['api'] for f in PRODUCT], 'Lead': [f['api'] for f in LEAD], 'Competitor__c': [f['api'] for f in COMPETITOR],
    }
    readonly = {}
    required = {}
    for obj, lst in [('Sample_Request__c', SR), ('Competitor_Intel__c', CI), ('Customer_Onboarding__c', ONB), ('Integration_Log__c', IL), ('Opportunity', OPP), ('Account', ACC), ('Quote', QUOTE), ('QuoteLineItem', QLI), ('Order', ORDER), ('Case', CASE), ('Product2', PRODUCT), ('Lead', LEAD), ('Competitor__c', COMPETITOR)]:
        readonly[obj] = [f['api'] for f in lst if f.get('formula') or f['type'] == 'Summary']
        required[obj] = [f['api'] for f in lst if f.get('required')]
    with open(os.path.join(os.path.dirname(__file__), 'field_inventory.json'), 'w') as fh:
        json.dump({'fields': inv, 'readonly': readonly, 'required': required}, fh, indent=1)
    print('objects written')

if __name__ == '__main__':
    main()
