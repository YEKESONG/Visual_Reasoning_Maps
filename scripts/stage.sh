#!/usr/bin/env bash
set -euo pipefail
# Run stage-specific checks before invoking this helper.
git add -A
git diff --cached --check
git commit -m "$1"
if [ ! -f .git/push-failed ]; then
  if ! GIT_SSH_COMMAND='ssh -o BatchMode=yes -o ConnectTimeout=10' git push -u origin main; then
    touch .git/push-failed
    echo 'Push failed; subsequent stages will retain local commits.' >&2
  fi
fi
