// Game state machine: snapshot building, player actions, enemy turn orchestration.
// Pure TS. Full snapshot after every action (snapshot state sync) + transient
// event stream for staged visuals (floating numbers, telegraphs).

import {
  GRID_COLS,
  GRID_ROWS,
  HAND_LIMIT,
  HERO_UID,
  LOG_CAP,
  MANA_MAX,
  MOVE_BUDGET,
} from './contract';
import type {
  CardInstance,
  Controller,
  ControllerAction,
  EnemyIntent,
  GameAction,
  GameEvent,
  GameSnapshot,
  GridPos,
  Phase,
  Unit,
  Winner,
} from './contract';
import { attackableTargets, key, reachableTiles } from './grid';
import { applyDamage, resolveAttack } from './combat';
import { interestDue, isForeclosed } from './economy';
import { cardDef, makeDeck, resolveCardActions, shuffle } from './cards';
import { planEnemyTurn } from './ai';

interface State {
  turn: number;
  phase: Phase;
  coins: number;
  mana: number;
  hand: CardInstance[];
  deck: CardInstance[];
  discard: CardInstance[];
  sellPile: CardInstance[];
  units: Unit[];
  selectedUnitUid: string | null;
  activeCardUid: string | null;
  committedIntents: EnemyIntent[];
  log: string[];
  winner: Winner;
  foreclosed: boolean;
}

function log(state: State, line: string): void {
  state.log.push(line);
  if (state.log.length > LOG_CAP) state.log.splice(0, state.log.length - LOG_CAP);
}

export function createController(
  rng: () => number = Math.random,
  initialUnits?: Unit[],
): Controller {
  const listeners = new Set<(s: GameSnapshot) => void>();
  const eventListeners = new Set<(e: GameEvent) => void>();
  let state: State;

  function unit(uid: string): Unit | undefined {
    return state.units.find((u) => u.uid === uid);
  }

  function unitsAlive(team: 'player' | 'enemy'): Unit[] {
    return state.units.filter((u) => u.alive && u.team === team);
  }

  function emitEvent(e: GameEvent): void {
    for (const fn of eventListeners) fn(e);
  }

  function updateWinner(): void {
    if (state.winner) return;
    if (unitsAlive('player').length === 0) {
      state.winner = 'enemy';
      state.phase = 'gameover';
      emitEvent({ type: 'game-over', winner: 'enemy' });
    } else if (unitsAlive('enemy').length === 0) {
      state.winner = 'player';
      state.phase = 'gameover';
      log(state, 'Accounts settled.');
      emitEvent({ type: 'game-over', winner: 'player' });
    }
  }

  function buildSnapshot(): GameSnapshot {
    return {
      turn: state.turn,
      phase: state.phase,
      coins: state.coins,
      interestDue: interestDue(state.turn),
      mana: state.mana,
      hand: [...state.hand],
      deck: [...state.deck],
      discard: [...state.discard],
      sellPile: [...state.sellPile],
      units: state.units.map((u) => ({ ...u, pos: { ...u.pos } })),
      heroUid: HERO_UID,
      selectedUnitUid: state.selectedUnitUid,
      validMoves: validMoves(),
      validAttackTargets: validAttackTargets(),
      activeCardUid: state.activeCardUid,
      activeCardTargets: validCardTargets(),
      activeCardUnitTargets: validCardUnitTargets(),
      enemyIntents: state.committedIntents.map((i) => ({
        ...i,
        to: i.to ? { ...i.to } : undefined,
      })),
      log: [...state.log],
      winner: state.winner,
      foreclosed: state.foreclosed,
    };
  }

  function emit(): GameSnapshot {
    const s = buildSnapshot();
    for (const fn of listeners) fn(s);
    return s;
  }

  function validMoves(): GridPos[] {
    if (state.phase !== 'player' || !state.selectedUnitUid) return [];
    const u = unit(state.selectedUnitUid);
    if (!u || !u.alive || u.moved || u.team !== 'player') return [];
    return reachableTiles(state.units, u.pos, MOVE_BUDGET, u.uid);
  }

  function validAttackTargets(): string[] {
    if (state.phase !== 'player' || !state.selectedUnitUid) return [];
    const u = unit(state.selectedUnitUid);
    if (!u || !u.alive || u.acted || u.team !== 'player') return [];
    return attackableTargets(state.units, u).map((t) => t.uid);
  }

  /** Empty-tile targets for the armed card; null when no tile-target card is armed. */
  function validCardTargets(): GridPos[] | null {
    if (state.phase !== 'player' || !state.activeCardUid) return null;
    const inst = cardInstance(state.activeCardUid);
    if (!inst) return null;
    const card = cardDef(inst.cardUid);
    if (card.target !== 'empty-tile') return null;
    const occupied = new Set(state.units.filter((u) => u.alive).map((u) => key(u.pos)));
    const tiles: GridPos[] = [];
    for (let x = 0; x < GRID_COLS; x++) {
      for (let y = 0; y < GRID_ROWS; y++) {
        if (!occupied.has(key({ x, y }))) tiles.push({ x, y });
      }
    }
    return tiles;
  }

  /** Unit uids valid as targets for the armed card; empty otherwise. */
  function validCardUnitTargets(): string[] {
    if (state.phase !== 'player' || !state.activeCardUid) return [];
    const inst = cardInstance(state.activeCardUid);
    if (!inst) return [];
    const card = cardDef(inst.cardUid);
    if (card.target === 'enemy-unit') {
      return state.units.filter((u) => u.alive && u.team === 'enemy').map((u) => u.uid);
    }
    if (card.target === 'friendly-unit') {
      return state.units.filter((u) => u.alive && u.team === 'player').map((u) => u.uid);
    }
    return [];
  }

  function cardInstance(uid: string): CardInstance | undefined {
    return state.hand.find((c) => c.uid === uid);
  }

  function drawCards(count: number): void {
    for (let i = 0; i < count; i++) {
      if (state.deck.length === 0) {
        if (state.discard.length === 0) return;
        state.deck = shuffle(state.discard, rng);
        state.discard = [];
      }
      const c = state.deck.pop()!;
      if (state.hand.length >= HAND_LIMIT) {
        state.discard.push(c);
        emitEvent({ type: 'card-drawn', cardUid: c.cardUid, burned: true });
      } else {
        state.hand.push(c);
        emitEvent({ type: 'card-drawn', cardUid: c.cardUid, burned: false });
      }
    }
  }

  function applyActions(actions: GameAction[], sourceName: string): void {
    for (const a of actions) {
      switch (a.kind) {
        case 'deal-damage': {
          const t = unit(a.targetUid);
          if (!t || !t.alive) continue;
          applyDamage(t, a.amount);
          log(state, `${sourceName} hits ${t.name} for ${a.amount}.`);
          if (!t.alive) log(state, `${t.name} is sunk.`);
          break;
        }
        case 'heal': {
          const t = unit(a.targetUid);
          if (!t || !t.alive) continue;
          t.hp = Math.min(t.maxHp, t.hp + a.amount);
          log(state, `${sourceName} restores ${t.name} for ${a.amount}.`);
          break;
        }
        case 'shield': {
          const t = unit(a.targetUid);
          if (!t || !t.alive) continue;
          t.block += a.amount;
          log(state, `${sourceName} shields ${t.name} for ${a.amount}.`);
          break;
        }
        case 'summon': {
          const occupied = new Set(state.units.filter((u) => u.alive).map((u) => key(u.pos)));
          if (occupied.has(key(a.pos))) continue;
          const uid = `unit-${state.turn}-${a.unitName.toLowerCase()}-${state.units.length}`;
          state.units.push({
            uid,
            name: a.unitName,
            team: 'player',
            pos: { ...a.pos },
            hp: a.hp,
            maxHp: a.hp,
            attack: a.attack,
            block: 0,
            moved: true,
            acted: true,
            alive: true,
          });
          log(state, `${a.unitName} is on the books.`);
          break;
        }
        case 'draw':
          drawCards(a.count);
          break;
        case 'gold':
          state.coins += a.amount;
          log(state, `${sourceName} nets ${a.amount} gold.`);
          break;
        case 'mana':
          state.mana = Math.min(MANA_MAX, state.mana + a.amount);
          log(state, `${sourceName} adds ${a.amount} mana.`);
          break;
      }
    }
    updateWinner();
  }

  function commitIntents(): void {
    const plan = planEnemyTurn(state.units);
    const attackMap = new Map<string, EnemyIntent>();
    for (const a of plan.attacks) {
      const attacker = unit(a.unitUid);
      const defender = unit(a.targetUid);
      const damage = attacker && defender ? Math.max(0, attacker.attack - defender.block) : 0;
      attackMap.set(a.unitUid, { unitUid: a.unitUid, kind: 'attack', targetUid: a.targetUid, damage });
    }
    const moveMap = new Map<string, EnemyIntent>();
    for (const m of plan.moves) {
      moveMap.set(m.unitUid, { unitUid: m.unitUid, kind: 'move', to: m.to });
    }
    const intents: EnemyIntent[] = [];
    for (const e of state.units.filter((u) => u.alive && u.team === 'enemy')) {
      intents.push(attackMap.get(e.uid) ?? moveMap.get(e.uid) ?? { unitUid: e.uid, kind: 'hold' });
    }
    state.committedIntents = intents;
  }

  function endPlayerTurn(): void {
    // Interest accrues.
    const due = interestDue(state.turn);
    if (due > 0) {
      state.coins -= due;
      log(state, `Interest due: ${due}.`);
      emitEvent({ type: 'interest-charged', amount: due, coins: state.coins });
      if (isForeclosed(state.turn, state.coins)) {
        state.foreclosed = true;
        state.winner = 'enemy';
        state.phase = 'gameover';
        log(state, `Foreclosure. Guppy loses the books.`);
        emitEvent({ type: 'foreclosed' });
        emitEvent({ type: 'game-over', winner: 'enemy' });
        return;
      }
    }

    state.phase = 'enemy';
    // Execute the committed plan; re-plan only entries that became illegal.
    const freshPlan = planEnemyTurn(state.units);
    const freshAttacks = new Map(freshPlan.attacks.map((a) => [a.unitUid, a]));
    const freshMoves = new Map(freshPlan.moves.map((m) => [m.unitUid, m]));
    const actedEnemy = new Set<string>();

    for (const intent of state.committedIntents) {
      const a = unit(intent.unitUid);
      if (!a || !a.alive) continue;
      if (intent.kind === 'attack' && intent.targetUid) {
        const d = unit(intent.targetUid);
        const legal = d && d.alive && attackableTargets(state.units, a).some((t) => t.uid === d.uid);
        const target = legal ? d! : (freshAttacks.get(a.uid) && unit(freshAttacks.get(a.uid)!.targetUid));
        if (!target || !target.alive) continue;
        const attacker = unit(a.uid)!;
        a.acted = true;
        actedEnemy.add(a.uid);
        const result = resolveAttack(attacker, target);
        applyDamage(target, result.damageToDefender);
        log(state, `${attacker.name} hits ${target.name} for ${result.damageToDefender}.`);
        if (!target.alive) log(state, `${target.name} is sunk.`);
        if (result.damageToAttacker > 0 && target.alive) {
          applyDamage(attacker, result.damageToAttacker);
          log(state, `${target.name} counters for ${result.damageToAttacker}.`);
          if (!attacker.alive) log(state, `${attacker.name} is sunk.`);
        }
        emitEvent({
          type: 'attack-resolved',
          attackerUid: attacker.uid,
          defenderUid: target.uid,
          damage: result.damageToDefender,
          counterDamage: result.damageToAttacker,
          deaths: [target.alive ? '' : target.uid, attacker.alive ? '' : attacker.uid].filter(Boolean),
        });
        continue;
      }
      if (intent.kind === 'move' && intent.to) {
        const from = { ...a.pos };
        const occupied = new Set(state.units.filter((u) => u.alive && u.uid !== a.uid).map((u) => key(u.pos)));
        const fresh = freshMoves.get(a.uid);
        const dest =
          !occupied.has(key(intent.to)) && reachableTiles(state.units, a.pos, MOVE_BUDGET, a.uid).some((t) => t.x === intent.to!.x && t.y === intent.to!.y)
            ? intent.to
            : fresh && !occupied.has(key(fresh.to)) && reachableTiles(state.units, a.pos, MOVE_BUDGET, a.uid).some((t) => t.x === fresh.to.x && t.y === fresh.to.y)
              ? fresh.to
              : null;
        if (dest) {
          a.pos = { ...dest };
          a.moved = true;
          actedEnemy.add(a.uid);
          log(state, `${a.name} moves.`);
          emitEvent({ type: 'unit-moved', uid: a.uid, from, to: dest });
        }
      }
    }

    const idle = state.units.filter(
      (u) => u.alive && u.team === 'enemy' && !actedEnemy.has(u.uid),
    );
    for (const u of idle) log(state, `${u.name} holds ground.`);
    for (const u of state.units) {
      u.moved = false;
      u.acted = false;
    }
    updateWinner();
    if (state.winner) return;

    // Next player turn: refresh mana to the turn value (unused mana is lost).
    state.turn += 1;
    state.mana = Math.min(MANA_MAX, state.turn);
    state.selectedUnitUid = null;
    state.activeCardUid = null;
    drawCards(1);
    commitIntents();
    state.phase = 'player';
    emitEvent({ type: 'turn-changed', turn: state.turn, phase: 'player' });
  }

  function selectUnit(uid: string | null): void {
    if (state.phase !== 'player') return;
    if (uid === null) {
      state.selectedUnitUid = null;
      emit();
      return;
    }
    const u = unit(uid);
    if (!u || !u.alive) return;
    // Card-targeting mode: an active unit-target card may select its target unit.
    if (state.activeCardUid) {
      const inst = cardInstance(state.activeCardUid);
      if (inst) {
        const def = cardDef(inst.cardUid);
        const matches =
          def.target === 'enemy-unit'
            ? u.team === 'enemy'
            : def.target === 'friendly-unit'
              ? u.team === 'player'
              : false;
        if (matches) {
          state.selectedUnitUid = uid;
          emit();
          return;
        }
      }
    }
    if (u.team !== 'player') return; // enemies are only selectable as card targets
    state.selectedUnitUid = uid;
    state.activeCardUid = null;
    emit();
  }

  function moveSelectedTo(pos: GridPos): void {
    if (state.phase !== 'player' || !state.selectedUnitUid) return;
    const u = unit(state.selectedUnitUid);
    if (!u || !u.alive || u.moved || u.team !== 'player') return;
    const reachable = reachableTiles(state.units, u.pos, MOVE_BUDGET, u.uid);
    if (!reachable.some((t) => t.x === pos.x && t.y === pos.y)) return;
    const from = { ...u.pos };
    u.pos = { ...pos };
    u.moved = true;
    log(state, `${u.name} moves.`);
    emitEvent({ type: 'unit-moved', uid: u.uid, from, to: { ...pos } });
    emit();
  }

  function attackTarget(uid: string): void {
    if (state.phase !== 'player' || !state.selectedUnitUid) return;
    const a = unit(state.selectedUnitUid);
    const d = unit(uid);
    if (!a || !d || !a.alive || !d.alive || a.acted || a.team !== 'player') return;
    const targets = attackableTargets(state.units, a);
    if (!targets.some((t) => t.uid === uid)) return;
    a.acted = true;
    const result = resolveAttack(a, d);
    applyDamage(d, result.damageToDefender);
    log(state, `${a.name} hits ${d.name} for ${result.damageToDefender}.`);
    if (!d.alive) log(state, `${d.name} is sunk.`);
    if (result.damageToAttacker > 0 && d.alive) {
      applyDamage(a, result.damageToAttacker);
      log(state, `${d.name} counters for ${result.damageToAttacker}.`);
      if (!a.alive) log(state, `${a.name} is sunk.`);
    }
    if (!a.alive) state.selectedUnitUid = null; // clear dangling corpse selection
    emitEvent({
      type: 'attack-resolved',
      attackerUid: a.uid,
      defenderUid: d.uid,
      damage: result.damageToDefender,
      counterDamage: result.damageToAttacker,
      deaths: [d.alive ? '' : d.uid, a.alive ? '' : a.uid].filter(Boolean),
    });
    updateWinner();
    emit();
  }

  function setActiveCard(uid: string | null): void {
    if (state.phase !== 'player') return;
    if (uid === null) {
      state.activeCardUid = null;
      emit();
      return;
    }
    const c = cardInstance(uid);
    if (!c) return;
    const def = cardDef(c.cardUid);
    if (state.mana < def.cost) return;
    state.activeCardUid = uid;
    state.selectedUnitUid = null;
    emit();
  }

  function playCard(target?: GridPos): void {
    if (state.phase !== 'player' || !state.activeCardUid) return;
    const inst = cardInstance(state.activeCardUid);
    if (!inst) return;
    const def = cardDef(inst.cardUid);
    if (state.mana < def.cost) return;
    if (def.target === 'empty-tile') {
      if (!target) return;
      const valid = validCardTargets() ?? [];
      if (!valid.some((t) => t.x === target.x && t.y === target.y)) return;
    }

    // Resolve the unit target BEFORE spending mana so a failed target costs nothing.
    let unitTarget: Unit | undefined;
    if (def.target === 'enemy-unit' || def.target === 'friendly-unit') {
      const sel = state.selectedUnitUid ? unit(state.selectedUnitUid) : undefined;
      if (sel && sel.alive) {
        if (def.target === 'enemy-unit' && sel.team === 'enemy') unitTarget = sel;
        if (def.target === 'friendly-unit' && sel.team === 'player') unitTarget = sel;
      }
      if (!unitTarget) {
        state.activeCardUid = null;
        emit();
        return;
      }
    }

    state.mana -= def.cost;
    const actions = resolveCardActions(def, { units: state.units, heroUid: HERO_UID }, unitTarget, target);
    state.hand = state.hand.filter((c) => c.uid !== inst.uid);
    state.discard.push(inst);
    state.activeCardUid = null;
    log(state, `${def.name} played.`);
    emitEvent({ type: 'card-played', cardUid: def.uid });
    applyActions(actions, def.name);
    emit();
  }

  function sellCard(uid: string): void {
    if (state.phase !== 'player') return;
    const c = cardInstance(uid);
    if (!c) return;
    state.hand = state.hand.filter((x) => x.uid !== uid);
    state.sellPile.push(c);
    if (state.activeCardUid === uid) state.activeCardUid = null; // never leave an armed ghost
    state.coins += 1;
    log(state, `${cardDef(c.cardUid).name} sold.`);
    emit();
  }

  function endTurn(): void {
    if (state.phase !== 'player') return;
    endPlayerTurn();
    emit();
  }

  function defaultUnits(): Unit[] {
    return [
      {
        uid: HERO_UID,
        name: 'Guppy',
        team: 'player',
        pos: { x: 1, y: 2 },
        hp: 12,
        maxHp: 12,
        attack: 2,
        block: 0,
        moved: false,
        acted: false,
        alive: true,
      },
      {
        uid: 'boss',
        name: 'Boss',
        team: 'enemy',
        pos: { x: 7, y: 2 },
        hp: 10,
        maxHp: 10,
        attack: 3,
        block: 0,
        moved: false,
        acted: false,
        alive: true,
      },
      {
        uid: 'thug-a',
        name: 'Thug',
        team: 'enemy',
        pos: { x: 6, y: 1 },
        hp: 4,
        maxHp: 4,
        attack: 2,
        block: 0,
        moved: false,
        acted: false,
        alive: true,
      },
      {
        uid: 'thug-b',
        name: 'Thug',
        team: 'enemy',
        pos: { x: 6, y: 3 },
        hp: 4,
        maxHp: 4,
        attack: 2,
        block: 0,
        moved: false,
        acted: false,
        alive: true,
      },
    ];
  }

  function start(): void {
    state = {
      turn: 1,
      phase: 'player',
      coins: 0,
      mana: 1,
      hand: [],
      deck: shuffle(makeDeck(), rng),
      discard: [],
      sellPile: [],
      units: initialUnits
        ? initialUnits.map((u) => ({
            ...u,
            pos: { ...u.pos },
            block: u.block ?? 0,
            moved: false,
            acted: false,
            alive: true,
          }))
        : defaultUnits(),
      selectedUnitUid: null,
      activeCardUid: null,
      committedIntents: [],
      log: [],
      winner: null,
      foreclosed: false,
    };
    drawCards(5);
    commitIntents();
    log(state, 'The ledger opens.');
    emit();
  }

  function onEvent(action: ControllerAction): void {
    switch (action.type) {
      case 'select-unit':
        selectUnit(action.uid);
        break;
      case 'move':
        moveSelectedTo(action.pos);
        break;
      case 'attack':
        attackTarget(action.uid);
        break;
      case 'select-card':
        setActiveCard(action.uid);
        break;
      case 'play-card':
        playCard(action.target);
        break;
      case 'sell-card':
        sellCard(action.uid);
        break;
      case 'end-turn':
        endTurn();
        break;
      case 'restart':
        start();
        break;
    }
  }

  return {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    subscribeEvents(fn) {
      eventListeners.add(fn);
      return () => eventListeners.delete(fn);
    },
    onEvent,
    getSnapshot: buildSnapshot,
    start,
    restart: start,
    selectUnit,
    moveSelectedTo,
    attackTarget,
    setActiveCard,
    validCardTargets,
    playCard,
    sellCard,
    endTurn,
  };
}
