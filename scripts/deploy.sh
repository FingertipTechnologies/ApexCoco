#!/usr/bin/env bash
# Apex Coco - Person 2 (Sample -> Opportunity -> Order): deploy to a Developer Edition / sandbox org.
#
#   ./scripts/deploy.sh <org-alias> [--with-lead-contract] [--data] [--golden-lead]
#
#   --with-lead-contract  also deploys manifest/lead-mdapi (the shared Lead fields, Rating Indicator, Lead Aging, Lead list
#                         views, layout, record page and Path). Needed on the first deployment and whenever the Lead
#                         contract changes; it runs BEFORE force-app because the permission sets reference the Lead fields.
#   --data                runs scripts/apex/loadDemoData_1..5 and loadLeadRatingDemo.apex (in that order) after deployment
#   --golden-lead         runs scripts/apex/loadGoldenLead.apex (merged Person 1 + Person 2 demo start)
set -euo pipefail
ORG="${1:?usage: deploy.sh <org-alias> [--with-lead-contract] [--data] [--golden-lead]}"; shift || true
WITH_LEAD=false; DATA=false; GOLDEN=false
for a in "$@"; do case "$a" in --with-lead-contract) WITH_LEAD=true;; --data) DATA=true;; --golden-lead) GOLDEN=true;; esac; done

cd "$(dirname "$0")/.."

# 1. Org settings first (Quotes, Orders, Path) - they must exist before Quote/Order metadata is deployed.
sf project deploy start --target-org "$ORG" --source-dir force-app/main/default/settings --wait 20

# 2. Shared Lead contract (optional, see above)
if $WITH_LEAD; then
  sf project deploy start --target-org "$ORG" --metadata-dir manifest/lead-mdapi --ignore-errors --wait 20
fi

# 3. Person 2 metadata
sf project deploy start --target-org "$ORG" --source-dir force-app --wait 60 --test-level RunSpecifiedTests --tests LeadSampleConversionServiceTest

# 3b. Lead list views (own package: a column-name problem must never block the Lead fields)
if $WITH_LEAD; then
  sf project deploy start --target-org "$ORG" --metadata-dir manifest/lead-listviews-mdapi --wait 20 || true
fi

# 4. Permission sets for the running user
for ps in Apex_Sales_Executive Apex_Sales_Manager Apex_Sales_Admin Apex_Management; do
  sf org assign permset --target-org "$ORG" --name "$ps" || true
done

# 5. Demo data
if $DATA; then
  for part in loadDemoData_1_Master loadDemoData_2_Pipeline loadDemoData_3_Commercial loadDemoData_4_Context loadDemoData_5_Finance loadLeadRatingDemo; do
    sf apex run --target-org "$ORG" --file "scripts/apex/$part.apex"
  done
fi
if $GOLDEN; then sf apex run --target-org "$ORG" --file scripts/apex/loadGoldenLead.apex; fi

echo "Done. Open the Apex Sales app: sf org open --target-org $ORG --path /lightning/app/c__Apex_Sales"
