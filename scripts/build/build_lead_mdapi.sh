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
open(obj, 'w').write(s)
pkg = os.path.join(out, 'package.xml'); p = open(pkg).read()
p = p.replace('        <members>Lead.Interested_Product__c</members>\n', '')
open(pkg, 'w').write(p)
PY
rm -rf manifest/lead-mdapi/objects manifest/lead-mdapi/layouts manifest/lead-mdapi/flexipages manifest/lead-mdapi/pathAssistants manifest/lead-mdapi/standardValueSets manifest/lead-mdapi/package.xml
cp -r "$TMP/out/." manifest/lead-mdapi/
rm -rf "$TMP"
echo "manifest/lead-mdapi rebuilt"
