#!/usr/bin/env bash
# Rebuilds manifest/lead-mdapi (Metadata API format of shared-lead-contract/) so it can be deployed with
#   sf project deploy start --metadata-dir manifest/lead-mdapi --ignore-errors --wait 20
# Interested_Product__c is removed: orgs that already hold it as a lookup cannot change its type.
set -euo pipefail
cd "$(dirname "$0")/../.."
TMP="$(mktemp -d)"
sf project convert source --source-dir shared-lead-contract --output-dir "$TMP/out" >/dev/null
python3 - "$TMP/out" <<'PY'
import re, sys, os
out = sys.argv[1]
obj = os.path.join(out, 'objects', 'Lead.object'); s = open(obj).read()
s = re.sub(r'    <fields>\n        <fullName>Interested_Product__c</fullName>.*?\n    </fields>\n', '', s, flags=re.S)
# list views go to their own package (manifest/lead-listviews-mdapi) so a column-name problem never blocks the fields
views = re.findall(r'    <listViews>\n.*?\n    </listViews>\n', s, flags=re.S)
s = re.sub(r'    <listViews>\n.*?\n    </listViews>\n', '', s, flags=re.S)
open(obj, 'w').write(s)
pkg = os.path.join(out, 'package.xml'); p = open(pkg).read()
p = p.replace('        <members>Lead.Interested_Product__c</members>\n', '')
lv_type = re.search(r'    <types>\n(?:        <members>Lead\.[^<]+</members>\n)+        <name>ListView</name>\n    </types>\n', p)
if lv_type:
    p = p.replace(lv_type.group(0), '')
open(pkg, 'w').write(p)
lv = os.path.join(out, '..', 'listviews'); os.makedirs(os.path.join(lv, 'objects'), exist_ok=True)
hdr = '<?xml version="1.0" encoding="UTF-8"?>\n<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">\n'
open(os.path.join(lv, 'objects', 'Lead.object'), 'w').write(hdr + ''.join(views) + '</CustomObject>\n')
open(os.path.join(lv, 'package.xml'), 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n' + (lv_type.group(0) if lv_type else '') + '    <version>61.0</version>\n</Package>\n')
PY
rm -rf manifest/lead-mdapi/objects manifest/lead-mdapi/layouts manifest/lead-mdapi/flexipages manifest/lead-mdapi/pathAssistants manifest/lead-mdapi/standardValueSets manifest/lead-mdapi/package.xml
cp -r "$TMP/out/." manifest/lead-mdapi/
rm -rf manifest/lead-listviews-mdapi/objects manifest/lead-listviews-mdapi/package.xml
mkdir -p manifest/lead-listviews-mdapi && cp -r "$TMP/listviews/." manifest/lead-listviews-mdapi/
rm -rf "$TMP"
echo "manifest/lead-mdapi rebuilt"
