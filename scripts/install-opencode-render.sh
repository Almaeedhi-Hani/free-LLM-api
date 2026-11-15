#!/usr/bin/env bash
set -euo pipefail
# Match the OpenCode installer already used by GEO CI.
curl --fail --silent --show-error --location https://opencode.ai/v2/install | bash
source_bin="${HOME}/.opencode/bin/opencode"
test -x "$source_bin" || { echo "OpenCode CLI missing after install" >&2; exit 1; }
mkdir -p .runtime-bin
cp "$source_bin" .runtime-bin/opencode
chmod 755 .runtime-bin/opencode
.runtime-bin/opencode --version
