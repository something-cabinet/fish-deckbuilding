---
title: SVG Duplicate Attributes Rejected by Browser
type: memory
tags: [svg, xml, ui, bug]
status: active
---

SVG files with duplicate class/attribute names are silently rejected by browser XML parsers — the image shows as broken with no console error. Always validate SVGs after generation. Full reference: @wiki/concepts/playtest-ui-bug-patterns