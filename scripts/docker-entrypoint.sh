#!/bin/sh
set -eu

node scripts/validate-production-env.mjs

exec node .output/server/index.mjs
