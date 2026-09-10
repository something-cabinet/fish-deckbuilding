# Changelog

## [Unreleased]

### Added
- Fin upgrade shop (SPEC D11): Fin can now be spent at shop nodes to upgrade cards deck-wide. Each upgrade level bumps damage/heal effect amounts by 1, adds a "+N" name marker, and raises sell value. Cost scales per level (15 + 15 × level), capped at level 5. Accessible from any shop node when `fin > 0`.
- 9 new crime-noir themed cards: Rub-Out (0-cost 1dmg), Bury the Evidence (1-cost 1dmg+cycle), Protection Money (2-cost 2dmg+2coin), Tax Audit (3-cost 4dmg+1coin), Shell Game (0-cost draw 1), The Treatment (1-cost heal 3 ally), Protection Racket (2-cost ally +2 ATK), Mermaid's Call (summon Siren 4-cost).
- Siren summon template (7 HP / 3 ATK), used by Mermaid's Call.
- 5 new trinkets: Oyster Ledger (+2 draws on combat start, uncommon), Razor Gill (+2 ATK, rare), Mob Loyalty Card (5 coin per kill, rare), Swimming Fins (+1 move, common).
- 2 new enemy templates: The Fixer (ranged artillery, aiProfile: artillery), The Loan Officer (guardian, aiProfile: guardian).
- 5 new stages: Witness Protection (shallows elite w/ Fixer), The Twilight Gauntlet (midwaters normal), The Ledger Desk (midwaters elite w/ Loan Officers), The Bottom Line (depths normal).
- 4 new events: The Slippery Pawn (card reward option), The Lost Purse (debt/gold choice), The Fence's Market (trinket reward options).
- Fill/balance: Fixer and Loan Officer added to midwaters/depths zone battle pools so generated (non-stage) battles also feature them.

### Fixed
- Trinket maxHp bonus (e.g. Shark Tooth +5, Coral Crown +8) now also raises the hero's current HP at battle start, so the extra pool is immediately usable instead of requiring a heal source.
- Cards with no legal target in range (e.g. an attack card when all enemies are dead or out of range) no longer glow gold as playable — they render dim like any unaffordable card.
- Stale hardcoded card-count assertions in card-library-screen test were replaced with data-driven lookups so the test doesn't break when the card pool grows.
- TypeScript compile errors cleaned up in card-library-screen test (CardType enum usage) and duplicate import in overworld-engine spec.