#!/usr/bin/env python3
"""Generates page layouts and Lightning record pages (FlexiPages) for the Apex Person 2 build."""
import os
from xml.sax.saxutils import escape as X
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
FA = os.path.join(ROOT, 'force-app', 'main', 'default')
NS = 'http://soap.sforce.com/2006/04/metadata'
HDR = '<?xml version="1.0" encoding="UTF-8"?>\n'

def w(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'w').write(content)

# ------------------------------------------------------------------ layouts
def section(label, cols, style='TwoColumnsTopToBottom', detail=True, edit=True):
    if style == 'OneColumn':
        cols = [[i for col in cols for i in col]]
    out = ['    <layoutSections>', '        <customLabel>true</customLabel>', f'        <detailHeading>{"true" if detail else "false"}</detailHeading>', f'        <editHeading>{"true" if edit else "false"}</editHeading>', f'        <label>{X(label)}</label>']
    for col in cols:
        out.append('        <layoutColumns>')
        for item in col:
            if item is None:
                out += ['            <layoutItems>', '                <emptySpace>true</emptySpace>', '            </layoutItems>']
            else:
                beh, fld = item if isinstance(item, tuple) else ('Edit', item)
                out += ['            <layoutItems>', f'                <behavior>{beh}</behavior>', f'                <field>{fld}</field>', '            </layoutItems>']
        out.append('        </layoutColumns>')
    out += [f'        <style>{style}</style>', '    </layoutSections>']
    return '\n'.join(out) + '\n'

def sysinfo(created='CreatedById', modified='LastModifiedById'):
    return section('System Information', [[('Readonly', created)], [('Readonly', modified)]])

def layout_xml(sections, related, actions=None, quick_actions=None, highlights=True):
    out = HDR + f'<Layout xmlns="{NS}">\n'
    out += ''.join(sections)
    if actions:
        out += '    <platformActionList>\n        <actionListContext>Record</actionListContext>\n'
        for i, (name, typ) in enumerate(actions):
            out += f'        <platformActionListItems>\n            <actionName>{name}</actionName>\n            <actionType>{typ}</actionType>\n            <sortOrder>{i}</sortOrder>\n        </platformActionListItems>\n'
        out += '    </platformActionList>\n'
    if quick_actions:
        out += '    <quickActionList>\n'
        for name in quick_actions:
            out += f'        <quickActionListItems>\n            <quickActionName>{name}</quickActionName>\n        </quickActionListItems>\n'
        out += '    </quickActionList>\n'
    for rl in related:
        name, fields = rl if isinstance(rl, tuple) else (rl, [])
        out += '    <relatedLists>\n' + ''.join(f'        <fields>{f}</fields>\n' for f in fields) + f'        <relatedList>{name}</relatedList>\n    </relatedLists>\n'
    out += ('    <showEmailCheckbox>false</showEmailCheckbox>\n'
            f'    <showHighlightsPanel>{"true" if highlights else "false"}</showHighlightsPanel>\n'
            '    <showInteractionLogPanel>false</showInteractionLogPanel>\n'
            '    <showRunAssignmentRulesCheckbox>false</showRunAssignmentRulesCheckbox>\n'
            '    <showSubmitAndAttachButton>false</showSubmitAndAttachButton>\n')
    out += '</Layout>\n'
    return out

STD = [('NewTask', 'QuickAction'), ('LogACall', 'QuickAction'), ('NewEvent', 'QuickAction'), ('SendEmail', 'QuickAction'), ('Edit', 'StandardButton'), ('Delete', 'StandardButton'), ('Clone', 'StandardButton'), ('ChangeOwnerOne', 'StandardButton')]
SR_FIELDS = ['NAME', 'Product__c', 'Iteration_Number__c', 'Status__c', 'Result__c', 'Requested_Date__c', 'Dispatch_Date__c', 'Tracking_Number__c']

# Sample_Request__c
w(f'{FA}/layouts/Sample_Request__c-Apex Sample Request Layout.layout-meta.xml', layout_xml([
    section('Sample Request', [[('Readonly', 'Name'), 'Account__c', ('Required', 'Contact__c'), 'Opportunity__c', 'Lead__c', 'OwnerId'],
                               [('Required', 'Status__c'), 'Product__c', 'Specification__c', ('Required', 'Sample_Quantity__c'), ('Required', 'Sample_Unit__c'), ('Required', 'Iteration_Number__c'), 'Parent_Sample_Request__c']]),
    section('Preparation & Dispatch', [[('Required', 'Requested_Date__c'), 'Prepared_Date__c', 'Batch_Number__c', 'Expected_Delivery__c'],
                                       ['Dispatch_Date__c', 'Courier_Partner__c', 'Tracking_Number__c', ('Readonly', 'Tracking_Link__c')]]),
    section('Customer Testing & Feedback', [['Feedback_Due_Date__c', 'Feedback_Received_Date__c', 'Customer_Feedback__c'],
                                            ['Result__c', 'Rejection_Reason__c', 'Approval_Date__c', ('Readonly', 'Days_Pending_Feedback__c')]]),
    section('Next Action', [['Next_Action__c', 'Next_Action_Date__c'], ['Closure_Reason__c', ('Readonly', 'Days_Since_Request__c'), ('Readonly', 'Is_Open__c')]]),
    section('Notes', [['Notes__c'], []], style='OneColumn'),
    sysinfo(),
], [('Sample_Request__c.Parent_Sample_Request__c', SR_FIELDS), 'RelatedActivityList', 'RelatedHistoryList', 'RelatedFileList'],
    actions=[('Sample_Request__c.New_Iteration', 'QuickAction')] + STD))

# Competitor_Intel__c
w(f'{FA}/layouts/Competitor_Intel__c-Apex Competitor Intel Layout.layout-meta.xml', layout_xml([
    section('Competitor Intel', [[('Readonly', 'Name'), ('Required', 'Competitor_Name__c'), 'Account__c', 'Opportunity__c', 'Product__c', 'OwnerId'],
                                 ['Quoted_Price__c', 'Price_Unit__c', 'Source__c', 'Intel_Date__c']]),
    section('Assessment', [['Customer_Preference__c', 'Strength__c'], ['Weakness__c']]),
    section('Notes', [['Notes__c'], []], style='OneColumn'),
    sysinfo(),
], ['RelatedActivityList', 'RelatedHistoryList'], actions=STD))

# Customer_Onboarding__c
w(f'{FA}/layouts/Customer_Onboarding__c-Apex Customer Onboarding Layout.layout-meta.xml', layout_xml([
    section('Onboarding', [[('Readonly', 'Name'), ('Required', 'Account__c'), 'Opportunity__c', 'OwnerId'],
                           ['Status__c', ('Readonly', 'Completion_Percent__c'), 'Due_Date__c', 'Completed_Date__c']]),
    section('Checklist (DEMO placeholders - validate exact documents with Apex)', [
        ['Company_Information_Status__c', 'Finance_Status__c', 'Quality_Status__c', 'Logistics_Status__c', 'Compliance_Status__c'],
        ['Company_Information_Owner__c', 'Finance_Owner__c', 'Quality_Owner__c', 'Logistics_Owner__c', 'Compliance_Owner__c']]),
    section('Notes', [['Notes__c'], []], style='OneColumn'),
    sysinfo(),
], ['RelatedActivityList', 'RelatedHistoryList', 'RelatedFileList'], actions=STD))

# Integration_Log__c
w(f'{FA}/layouts/Integration_Log__c-Apex Integration Log Layout.layout-meta.xml', layout_xml([
    section('Integration Log (DEMO - simulated SAP handoff)', [[('Readonly', 'Name'), 'Order__c', 'Opportunity__c', 'Record_Type_Name__c', 'Salesforce_Record_Id__c'],
                                                                ['Target_System__c', 'Direction__c', 'Integration_Mode__c', 'Status__c', 'Sent_Date_Time__c', 'Retry_Count__c']]),
    section('Payload & Response', [['Payload_Summary__c'], ['Response_Summary__c', 'Error_Message__c']]),
    sysinfo(),
], [], actions=STD))

# Opportunity
w(f'{FA}/layouts/Opportunity-Opportunity Layout.layout-meta.xml', layout_xml([
    section('Opportunity Information', [[('Required', 'Name'), ('Required', 'AccountId'), 'Opportunity_Type__c', 'Primary_Product__c', 'Expected_Annual_Volume__c', 'Volume_Unit__c', 'Purchase_Timeline__c', 'OwnerId'],
                                        [('Required', 'StageName'), ('Required', 'CloseDate'), 'Amount', 'Probability', 'Next_Action__c', 'Next_Action_Date__c', 'LeadSource', 'Type']]),
    section('Sample & Technical', [[('Readonly', 'Sample_Request_Count__c'), ('Readonly', 'Latest_Sample_Status__c'), 'Sample_Approved_Date__c'],
                                   ['Technical_Evaluation_Status__c', ('Readonly', 'Days_Since_Last_Activity__c'), ('Readonly', 'Is_Stale__c')]]),
    section('Commercial', [[('Readonly', 'Quote_Count__c'), ('Readonly', 'Latest_Quote_Price__c'), 'Current_Supplier__c', 'Competitor__c'],
                           ['Customer_Approval_Date__c', 'PO_Number__c', 'PO_Date__c', 'PO_Quantity__c']]),
    section('Closed Lost', [['Loss_Reason__c'], ['Loss_Details__c']]),
    section('Description', [['Description'], []], style='OneColumn'),
    sysinfo(),
], [('Sample_Request__c.Opportunity__c', SR_FIELDS), ('Competitor_Intel__c.Opportunity__c', ['NAME', 'Competitor_Name__c', 'Quoted_Price__c', 'Customer_Preference__c', 'Source__c']),
    ('Customer_Onboarding__c.Opportunity__c', ['NAME', 'Status__c', 'Completion_Percent__c', 'Due_Date__c']), 'RelatedQuoteList', 'RelatedOrderList', 'RelatedActivityList', 'RelatedHistoryList', 'RelatedFileList'],
    actions=[('Opportunity.New_Sample_Request', 'QuickAction'), ('Opportunity.New_Competitor_Intel', 'QuickAction')] + STD,
    quick_actions=['Opportunity.New_Sample_Request', 'Opportunity.New_Competitor_Intel']))

# Account
w(f'{FA}/layouts/Account-Account Layout.layout-meta.xml', layout_xml([
    section('Account Information', [[('Required', 'Name'), 'Customer_Type__c', 'Business_Type__c', 'Market__c', 'Industry', 'Website', 'Phone', 'OwnerId'],
                                    ['Type', 'ParentId', 'Onboarding_Status__c', 'AnnualRevenue', 'NumberOfEmployees', 'Description']]),
    section('Repeat Business', [['Last_Purchase_Date__c', 'Last_Order_Value__c', 'Last_Purchased_Product__c'],
                                ['Average_Reorder_Interval_Days__c', 'Expected_Reorder_Date__c', ('Readonly', 'Reorder_Status__c'), 'Orders_Last_12_Months__c']]),
    section('Address Information', [['BillingAddress'], ['ShippingAddress']]),
    sysinfo(),
], ['RelatedContactList',
    'RelatedOpportunityList',
    ('Sample_Request__c.Account__c', SR_FIELDS), ('Competitor_Intel__c.Account__c', ['NAME', 'Competitor_Name__c', 'Product__c', 'Quoted_Price__c', 'Customer_Preference__c']),
    ('Customer_Onboarding__c.Account__c', ['NAME', 'Status__c', 'Completion_Percent__c', 'Due_Date__c']),
    'RelatedCaseList',
    'RelatedQuoteList', 'RelatedOrderList',
    'RelatedActivityList', 'RelatedHistoryList', 'RelatedFileList'],
    actions=[('Account.New_Sample_Request', 'QuickAction')] + STD, quick_actions=['Account.New_Sample_Request']))

# Quote
w(f'{FA}/layouts/Quote-Quote Layout.layout-meta.xml', layout_xml([
    section('Quote Information', [[('Required', 'Name'), ('Readonly', 'QuoteNumber'), 'OpportunityId', ('Readonly', 'AccountId'), 'ContactId', 'OwnerId'],
                                  ['Status', 'Quote_Version__c', 'Previous_Quote__c', 'Revision_Reason__c', 'Quote_Date__c', 'ExpirationDate']]),
    section('Commercial Terms (DEMO - validate with Apex)', [['Payment_Terms__c', 'Delivery_Terms__c'], ['Competitor_Name__c', 'Competitor_Price__c', 'Description']]),
    section('Totals & Margin', [[('Readonly', 'Subtotal'), ('Readonly', 'Discount'), ('Readonly', 'TotalPrice'), ('Readonly', 'GrandTotal')],
                                [('Readonly', 'Total_Cost__c'), ('Readonly', 'Total_Margin__c'), ('Readonly', 'Margin_Percent__c')]]),
    section('Approval', [[('Readonly', 'Requires_Approval__c'), 'Approval_Status__c'], ['Sales_Manager_Approver__c', 'Management_Approver__c']]),
    section('Contact & Address', [['Email', 'Phone', 'BillingAddress'], ['ShippingAddress']]),
    sysinfo(),
], ['RelatedQuoteLineItemList', 'Quote.Previous_Quote__c', 'RelatedProcessHistoryList', 'RelatedActivityList', 'RelatedFileList'],
    actions=[('Quote.Revise_Quote', 'QuickAction'), ('SubmitForApproval', 'StandardButton')] + STD))

# Order
w(f'{FA}/layouts/Order-Order Layout.layout-meta.xml', layout_xml([
    section('Order Information', [[('Readonly', 'OrderNumber'), ('Required', 'AccountId'), 'OpportunityId', ('Required', 'Status'), ('Required', 'EffectiveDate'), 'OwnerId'],
                                  ['PoNumber', 'PoDate', ('Readonly', 'Pricebook2Id'), ('Readonly', 'TotalAmount'), 'Description']]),
    section('SAP Handoff (DEMO - simulated, real integration is Phase 2)', [['Integration_Mode__c', 'SAP_Status__c', 'SAP_Order_Number__c'], ['SAP_Invoice_Number__c', 'SAP_Sent_Date_Time__c', 'SAP_Last_Response__c']]),
    section('Address Information', [['BillingAddress'], ['ShippingAddress']]),
    sysinfo(),
], ['RelatedOrderItemList', ('Integration_Log__c.Order__c', ['NAME', 'Direction__c', 'Status__c', 'Sent_Date_Time__c', 'Response_Summary__c']), ('Case.Order__c', ['CASES.CASE_NUMBER', 'CASES.SUBJECT', 'CASES.STATUS']), 'RelatedActivityList', 'RelatedHistoryList', 'RelatedFileList'],
    actions=[('Order.Send_to_SAP', 'QuickAction'), ('Activate', 'StandardButton')] + STD))

# Case
w(f'{FA}/layouts/Case-Case Layout.layout-meta.xml', layout_xml([
    section('Complaint Information', [[('Readonly', 'CaseNumber'), 'ContactId', 'AccountId', 'OwnerId', 'Origin'],
                                      [('Required', 'Status'), 'Priority', 'Complaint_Type__c', 'Complaint_Product__c', 'Batch_Number__c', 'Order__c']]),
    section('Web Information', [[('Readonly', 'SuppliedEmail'), ('Readonly', 'SuppliedName')], [('Readonly', 'SuppliedPhone'), ('Readonly', 'SuppliedCompany')]]),
    section('Description', [['Subject', 'Description'], ['Resolution__c']], style='OneColumn'),
    sysinfo(),
], ['RelatedActivityList', 'RelatedHistoryList', 'RelatedFileList'], actions=STD))

# Lead (shared contract) and Competitor layouts live in shared-lead-contract/
SHL = FA.replace('force-app', 'shared-lead-contract')
w(f'{SHL}/layouts/Lead-Apex Lead Layout.layout-meta.xml', layout_xml([
    section('Lead Information', [[('Readonly', 'Lead_Number__c'), ('Required', 'Name'), ('Required', 'Company'), 'Designation__c', 'Title', ('Required', 'Status'), 'Rating', 'OwnerId'],
                                 ['Email', 'Phone', 'MobilePhone', 'WhatsApp_Number__c', 'Preferred_Communication__c', 'Customer_Response__c', 'Last_Contact_Date__c', 'Next_Followup_Date__c']]),
    section('Lead Source', [['LeadSource', 'Campaign__c'], ['Event_Name__c']]),
    section('Company Research', [['Website', 'LinkedIn_Profile__c', 'Country__c', 'Industry'], ['Company_Type__c', 'Employee_Count__c', 'Research_Completed__c', 'Research_Notes__c']]),
    section('Customer Classification & Qualification', [['Customer_Type__c', 'Business_Model__c', 'Potential_Category__c', 'Buying_Intent__c', 'Lead_Classification__c'],
                                                         ['Purchase_Timeline__c', 'Estimated_Annual_Volume__c', 'Expected_Monthly_Volume__c', 'Decision_Maker_Identified__c', 'Product_Requirement_Confirmed__c']]),
    section('Product Interest & Competitor', [['Interested_Product__c', 'Application_Usage__c'], ['Current_Supplier__c', 'Competitor__c', 'Reason_for_Switching__c']]),
    section('Sample Readiness (hand-off to Sample -> Opportunity)', [['Sample_Requested__c', 'Sample_Request_Date__c'], ['Sample_Product__c']]),
    section('AI', [['AI_Lead_Score__c', 'Lead_Health__c'], ['AI_Insights__c']]),
    section('Address', [['Address'], ['Description']]),
    sysinfo(),
], ['RelatedActivityList', 'RelatedHistoryList', 'RelatedFileList'],
    actions=[('Lead.Request_Sample', 'QuickAction'), ('Convert', 'StandardButton')] + STD))

# ------------------------------------------------------------------ flexipages
def comp(name, ident, props=None):
    out = ['        <itemInstances>', '            <componentInstance>']
    for k, v in (props or []):
        out += ['                <componentInstanceProperties>', f'                    <name>{k}</name>', f'                    <value>{X(str(v))}</value>', '                </componentInstanceProperties>']
    out += [f'                <componentName>{name}</componentName>', f'                <identifier>{ident}</identifier>', '            </componentInstance>', '        </itemInstances>']
    return '\n'.join(out) + '\n'

def rl(parent_field, rel_name, ident, rows=10):
    return comp('force:relatedListSingleContainer', ident, [('parentFieldApiName', parent_field), ('relatedListApiName', rel_name), ('relatedListComponentOverride', 'ENHANCED'), ('rowsToDisplay', rows), ('showActionBar', 'true')])

def region(name, items):
    return f'    <flexiPageRegions>\n' + ''.join(items) + f'        <name>{name}</name>\n        <type>Region</type>\n    </flexiPageRegions>\n'

def facet_tab(title, facet, ident):
    return comp('flexipage:tab', ident, [('body', facet), ('title', title)])

def flexipage(label, sobject, main, sidebar, path=True):
    """Standard Salesforce record page: header (highlights + Path), main column with Details / Related tabs, activity sidebar."""
    out = HDR + f'<FlexiPage xmlns="{NS}">\n'
    header = [comp('force:highlightsPanel', 'force_highlightsPanel')] + ([comp('runtime_sales_pathassistant:pathAssistant', 'runtime_sales_pathassistant_pathAssistant')] if path else [])
    out += region('header', header)
    out += region('main', [comp('flexipage:tabset', 'flexipage_tabset', [('tabs', 'Facet-tabs')])])
    out += region('sidebar', sidebar)
    tabs = [facet_tab('Standard.Tab.detail', 'Facet-details', 'flexipage_tab_details'), facet_tab('Standard.Tab.relatedLists', 'Facet-related', 'flexipage_tab_related')]
    out += '    <flexiPageRegions>\n' + ''.join(tabs) + '        <name>Facet-tabs</name>\n        <type>Facet</type>\n    </flexiPageRegions>\n'
    out += '    <flexiPageRegions>\n' + ''.join(c for c in main if 'relatedListContainer' not in c) + '        <name>Facet-details</name>\n        <type>Facet</type>\n    </flexiPageRegions>\n'
    out += '    <flexiPageRegions>\n' + ''.join(c for c in main if 'relatedListContainer' in c) + '        <name>Facet-related</name>\n        <type>Facet</type>\n    </flexiPageRegions>\n'
    out += f'    <masterLabel>{X(label)}</masterLabel>\n    <sobjectType>{sobject}</sobjectType>\n    <template>\n        <name>flexipage:recordHomeTemplateDesktop</name>\n    </template>\n    <type>RecordPage</type>\n</FlexiPage>\n'
    return out

DETAIL = comp('force:detailPanel', 'force_detailPanel')
RLC = comp('force:relatedListContainer', 'force_relatedListContainer')
ACT = comp('runtime_sales_activities:activityPanel', 'runtime_sales_activities_activityPanel')

w(f'{FA}/flexipages/Apex_Sample_Request_Record_Page.flexipage-meta.xml', flexipage('Apex Sample Request Record Page', 'Sample_Request__c',
    [DETAIL, RLC], [ACT]))

w(f'{FA}/flexipages/Apex_Opportunity_Record_Page.flexipage-meta.xml', flexipage('Apex Opportunity Record Page', 'Opportunity',
    [DETAIL, RLC], [ACT]))

w(f'{FA}/flexipages/Apex_Account_Record_Page.flexipage-meta.xml', flexipage('Apex Account Record Page (Customer 360)', 'Account',
    [DETAIL, RLC], [ACT], path=False))

w(f'{FA}/flexipages/Apex_Quote_Record_Page.flexipage-meta.xml', flexipage('Apex Quote Record Page', 'Quote',
    [DETAIL, RLC], [ACT], path=False))

w(f'{FA}/flexipages/Apex_Order_Record_Page.flexipage-meta.xml', flexipage('Apex Order Record Page', 'Order',
    [DETAIL, RLC], [ACT], path=False))
print('ui written')
