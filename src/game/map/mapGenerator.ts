import type { MapNode, NodeType } from '../combat/CardTypes';

/**
 * Seeded pseudo-random number generator (mulberry32).
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pick a random element from an array using the provided RNG.
 */
function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Generate a branching map with seed support.
 * Each row has 1-3 nodes, connected to the next row.
 * Ensures all nodes are reachable from the start.
 */
export function generateMap(seed?: number): MapNode[] {
  const rng = seed !== undefined ? mulberry32(seed) : mulberry32(Date.now());
  const nodes: MapNode[] = [];
  const rows = 8;
  const cols = 4;

  for (let row = 0; row < rows; row++) {
    let count: number;
    if (row === 0 || row === rows - 1) {
      count = 1;
    } else {
      count = Math.floor(rng() * 2) + 2; // 2 or 3
    }

    // Space nodes evenly across the row
    for (let i = 0; i < count; i++) {
      let type: NodeType = 'combat';
      if (row === 0) {
        type = 'start';
      } else if (row === rows - 1) {
        type = 'boss';
      } else {
        const roll = rng();
        if (roll < 0.45) type = 'combat';
        else if (roll < 0.65) type = 'elite';
        else if (roll < 0.82) type = 'shop';
        else type = 'rest';
      }

      const xPos = count > 1 ? (i / (count - 1)) * (cols - 1) * 80 + 60 : 200;
      const yPos = row * 70 + 40;

      nodes.push({
        id: `node-${row}-${i}`,
        type,
        x: xPos,
        y: yPos,
        children: [],
        visited: false,
        cleared: false,
      });
    }
  }

  // Connect nodes between rows — ensure all nodes are reachable
  for (let row = 0; row < rows - 1; row++) {
    const currentRow = nodes.filter((n) => n.id.startsWith(`node-${row}-`));
    const nextRow = nodes.filter((n) =>
      n.id.startsWith(`node-${row + 1}-`)
    );

    // Each next-row node must have at least one connection
    const connectedNext = new Set<string>();

    for (const node of currentRow) {
      const shuffledNext = [...nextRow].sort(() => rng() - 0.5);
      let connections = 0;

      for (const next of shuffledNext) {
        if (rng() > 0.4 || connections === 0) {
          if (!node.children.includes(next.id)) {
            node.children.push(next.id);
            connectedNext.add(next.id);
            connections++;
          }
        }
        if (connections >= 2) break; // max 2 connections per node
      }

      // Ensure at least one connection
      if (node.children.length === 0 && nextRow.length > 0) {
        const fallback = nextRow[Math.floor(rng() * nextRow.length)];
        node.children.push(fallback.id);
        connectedNext.add(fallback.id);
      }
    }

    // Ensure every next-row node has at least one incoming connection
    for (const next of nextRow) {
      if (!connectedNext.has(next.id)) {
        // Find closest current-row node and connect
        const closest = currentRow.reduce((best, cur) =>
          Math.abs(cur.x - next.x) < Math.abs(best.x - next.x) ? cur : best
        );
        if (!closest.children.includes(next.id)) {
          closest.children.push(next.id);
        }
      }
    }
  }

  return nodes;
}
