#!/usr/bin/env python3
"""Regenerates manifest/package.xml and manifest/package-shared-lead-contract.xml from the source tree."""
import os
from collections import defaultdict
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
SUFFIX = {'flows': ('Flow', '.flow-meta.xml'), 'layouts': ('Layout', '.layout-meta.xml'), 'flexipages': ('FlexiPage', '.flexipage-meta.xml'),
          'permissionsets': ('PermissionSet', '.permissionset-meta.xml'), 'approvalProcesses': ('ApprovalProcess', '.approvalProcess-meta.xml'),
          'workflows': ('Workflow', '.workflow-meta.xml'), 'quickActions': ('QuickAction', '.quickAction-meta.xml'), 'pathAssistants': ('PathAssistant', '.pathAssistant-meta.xml'),
          'tabs': ('CustomTab', '.tab-meta.xml'), 'applications': ('CustomApplication', '.app-meta.xml'), 'queues': ('Queue', '.queue-meta.xml'),
          'notificationtypes': ('CustomNotificationType', '.notiftype-meta.xml'), 'customMetadata': ('CustomMetadata', '.md-meta.xml'),
          'standardValueSets': ('StandardValueSet', '.standardValueSet-meta.xml'), 'settings': ('Settings', '.settings-meta.xml'), 'reportTypes': ('ReportType', '.reportType-meta.xml')}
def build(root, out):
    types = defaultdict(set)
    for dp, dn, fn in os.walk(root):
        rel = os.path.relpath(dp, root)
        for f in fn:
            parts = os.path.join(rel, f).split(os.sep)
            folder = parts[0]
            if folder == 'objects':
                obj = parts[1]
                if len(parts) == 3: types['CustomObject'].add(obj)
                elif parts[2] == 'fields': types['CustomField'].add(f'{obj}.{f.replace(".field-meta.xml", "")}')
                elif parts[2] == 'validationRules': types['ValidationRule'].add(f'{obj}.{f.replace(".validationRule-meta.xml", "")}')
                elif parts[2] == 'listViews': types['ListView'].add(f'{obj}.{f.replace(".listView-meta.xml", "")}')
                elif parts[2] == 'compactLayouts': types['CompactLayout'].add(f'{obj}.{f.replace(".compactLayout-meta.xml", "")}')
            elif folder == 'classes':
                if f.endswith('.cls'): types['ApexClass'].add(f[:-4])
            elif folder == 'reports':
                types['Report'].add(f.replace('.reportFolder-meta.xml', '') if f.endswith('.reportFolder-meta.xml') else f'{parts[1]}/{f.replace(".report-meta.xml", "")}')
            elif folder == 'dashboards':
                types['Dashboard'].add(f.replace('.dashboardFolder-meta.xml', '') if f.endswith('.dashboardFolder-meta.xml') else f'{parts[1]}/{f.replace(".dashboard-meta.xml", "")}')
            elif folder in SUFFIX:
                t, suf = SUFFIX[folder]; types[t].add(f.replace(suf, ''))
    x = ['<?xml version="1.0" encoding="UTF-8"?>', '<Package xmlns="http://soap.sforce.com/2006/04/metadata">']
    for t in sorted(types):
        x.append('    <types>'); x += [f'        <members>{m}</members>' for m in sorted(types[t])]; x += [f'        <name>{t}</name>', '    </types>']
    x += ['    <version>61.0</version>', '</Package>']
    open(out, 'w').write('\n'.join(x) + '\n'); print(out, sum(len(v) for v in types.values()), 'members')
build(os.path.join(ROOT, 'force-app/main/default'), os.path.join(ROOT, 'manifest/package.xml'))
build(os.path.join(ROOT, 'shared-lead-contract/main/default'), os.path.join(ROOT, 'manifest/package-shared-lead-contract.xml'))
