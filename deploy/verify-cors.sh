#!/usr/bin/env bash
# Run after deploy. Exit 1 if CORS is still broken.
set -euo pipefail
ORIGIN="${1:-https://example.webflow.io}"
BASE="${2:-https://slotwise.hindaralabs.com}"
URL="$BASE/api/v1/sites/sw_cors_probe"

echo "Checking OPTIONS $URL"
OPTS=$(curl -sI -X OPTIONS \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: content-type" \
  "$URL")
echo "$OPTS"
echo "$OPTS" | grep -qi 'access-control-allow-origin: \*' || {
  echo "FAIL: OPTIONS missing Access-Control-Allow-Origin: *"
  exit 1
}

echo "Checking GET $URL"
GET=$(curl -sI -H "Origin: $ORIGIN" "$URL")
echo "$GET"
echo "$GET" | grep -qi 'access-control-allow-origin: \*' || {
  echo "FAIL: GET missing Access-Control-Allow-Origin: *"
  exit 1
}

echo "OK: CORS headers present"
