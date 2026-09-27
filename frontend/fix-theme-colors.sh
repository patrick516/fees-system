#!/bin/bash
# Bulk-replace hardcoded blue-* utilities with theme variables
# across the admin frontend.

set -e

FILES=$(find src/pages src/components -name "*.tsx" -not -path "*/ui/*")

# Order matters — do the more specific patterns FIRST so partial matches don't break later

# 1. Buttons — solid brand color
find src/pages src/components -name "*.tsx" -not -path "*/ui/*" -exec \
  sed -i \
    -e 's/bg-blue-900 text-white/bg-[var(--color-primary)] text-white/g' \
    -e 's/hover:bg-blue-800/hover:bg-[var(--color-primary-dark)]/g' \
  {} +

# 2. Standalone bg-blue-900 (active tabs, chip states)
find src/pages src/components -name "*.tsx" -not -path "*/ui/*" -exec \
  sed -i 's/bg-blue-900/bg-[var(--color-primary)]/g' {} +

# 3. Text — icon colors, headers, active tab labels
find src/pages src/components -name "*.tsx" -not -path "*/ui/*" -exec \
  sed -i 's/text-blue-900/text-[var(--color-primary)]/g' {} +

# 4. Hover text on links
find src/pages src/components -name "*.tsx" -not -path "*/ui/*" -exec \
  sed -i 's/hover:text-blue-700/hover:text-[var(--color-primary-dark)]/g' \
  {} +

# 5. Standalone text-blue-700 (informational links/labels — switch to primary-dark)
find src/pages src/components -name "*.tsx" -not -path "*/ui/*" -exec \
  sed -i 's/text-blue-700/text-[var(--color-primary-dark)]/g' {} +

# 6. Checkbox focus ring
find src/pages src/components -name "*.tsx" -not -path "*/ui/*" -exec \
  sed -i 's/focus:ring-blue-500/focus:ring-[var(--color-primary)]/g' {} +

echo "Done. Review with: git diff src/pages src/components"