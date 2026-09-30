#!/usr/bin/env bash
# Apex Coco - Person 2 (Sample -> Opportunity -> Order): deploy to a Developer Edition / sandbox org.
#
#   ./scripts/deploy.sh <org-alias> [--with-lead-contract] [--data] [--golden-lead]
#
#   --with-lead-contract  also deploys shared-lead-contract/ (the frozen Person 1 Lead fields). Use it in an org
#                         where Person 1's Lead fields are NOT yet present (Person 2 stand-alone testing).
#   --data                runs scripts/apex/loadDemoData.apex after deployment
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
  sf project deploy start --target-org "$ORG" --source-dir shared-lead-contract --wait 20
fi

# 3. Person 2 metadata
sf project deploy start --target-org "$ORG" --source-dir force-app --wait 60 --test-level RunSpecifiedTests --tests LeadSampleConversionServiceTest

# 4. Permission sets for the running user
for ps in Apex_Sales_Executive Apex_Sales_Manager Apex_Sales_Admin Apex_Management; do
  sf org assign permset --target-org "$ORG" --name "$ps" || true
done

# 5. Demo data
if $DATA;   then sf apex run --target-org "$ORG" --file scripts/apex/loadDemoData.apex;   fi
if $GOLDEN; then sf apex run --target-org "$ORG" --file scripts/apex/loadGoldenLead.apex; fi

echo "Done. Open the Apex Sales app: sf org open --target-org $ORG --path /lightning/app/c__Apex_Sales"
