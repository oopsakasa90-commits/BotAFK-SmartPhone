#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# 1) dọn node_modules cho nhẹ
find nodejs-project/node_modules \( -name "*.md" -o -name "*.map" -o -name "*.ts" -o -name "LICENSE*" \) -type f -delete 2>/dev/null || true
# 2) nén dự án Node thành 1 asset (giải nén lần đầu nhanh hơn chép hàng nghìn file)
mkdir -p app/src/main/assets
rm -f app/src/main/assets/nodejs-project.zip
(cd nodejs-project && zip -qr ../app/src/main/assets/nodejs-project.zip .)
# 3) tải libnode (Node.js cho Android)
if [ ! -d app/libnode/bin ]; then
  curl -fL -o /tmp/libnode.zip https://github.com/nodejs-mobile/nodejs-mobile/releases/download/v18.20.4/nodejs-mobile-v18.20.4-android.zip
  mkdir -p app/libnode && unzip -q /tmp/libnode.zip -d app/libnode
fi
ls app/libnode/bin
