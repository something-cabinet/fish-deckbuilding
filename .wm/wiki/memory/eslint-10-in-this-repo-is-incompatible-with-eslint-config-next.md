---
title: eslint@10 in this repo is incompatible with eslint-config-next
type: memory
tags: [tooling, eslint]
status: active
---

npm run lint fails: package.json pins eslint ^10.8.0 but eslint-plugin-react (via eslint-config-next) only supports eslint up to ^9.7 as of this session — its react/display-name rule calls the removed context.getFilename() API. Fix is downgrading eslint to ^9.39, not a fancier flat config. Full reference: @doc/concepts/eslint-10-incompatible-with-current-nextjs-lint-ecosystem