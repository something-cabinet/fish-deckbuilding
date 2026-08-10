---
title: CI nightly clippy lints differ from local
type: memory
tags: [ci, clippy, rust]
status: active
---

CI fetches latest nightly with newer clippy lints than local. Fix: run clippy before push, accept mechanical fixes. Full ref: @wiki/concepts:ci-nightly-clippy-drift