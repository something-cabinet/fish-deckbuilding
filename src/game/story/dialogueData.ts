/**
 * Dialogue scene data for campaign story moments.
 *
 * Each scene is a sequence of lines spoken by characters.
 * Scenes can unlock zones, navigate to screens on end, and present choices.
 */

export interface DialogueLine {
  speaker: string;
  text: string;
  portrait?: string; // sprite path, defaults to Guppy
}

export interface DialogueScene {
  id: string;
  lines: DialogueLine[];
  choices?: { text: string; nextScene?: string; action?: string }[];
  onEnd?: string; // screen to navigate to after dialogue
  zoneUnlock?: string[]; // zones to unlock on completion
}

export const DIALOGUES: Record<string, DialogueScene> = {
  chapter_1_intro: {
    id: 'chapter_1_intro',
    lines: [
      {
        speaker: 'Narrator',
        text: 'Guppy the Debtor owes a debt to the biggest shark in the underworld city of Coral Depths.',
      },
      {
        speaker: 'Narrator',
        text: 'The debt collector has given a deadline — pay up or become chum.',
      },
      {
        speaker: 'Guppy',
        text: "I need to find a way to make some coin... and fast.",
      },
      {
        speaker: 'Narrator',
        text: 'Your journey begins at Guppy Cove. Explore the island, fight enemies, collect cards, and grow stronger.',
      },
    ],
    onEnd: 'map',
  },

  chapter_2_intro: {
    id: 'chapter_2_intro',
    lines: [
      {
        speaker: 'Narrator',
        text: 'The first chapter of your journey is complete. Coral Shore lies behind you.',
      },
      {
        speaker: 'Guppy',
        text: "The debt collector's lair is somewhere in the deep. I need to push further.",
      },
      {
        speaker: 'Narrator',
        text: 'New zones have opened up. The Abyssal Trench awaits — and beyond it, The Maw.',
      },
    ],
    zoneUnlock: ['abyssal_trench', 'final_battle'],
    onEnd: 'map',
  },

  final_boss_intro: {
    id: 'final_boss_intro',
    lines: [
      {
        speaker: 'Narrator',
        text: "The Maw — the debt collector's lair. The air is thick with menace.",
      },
      {
        speaker: 'Guppy',
        text: "This is it. Either I settle my debt here... or I'm fish food.",
      },
      {
        speaker: 'Collector',
        text: "Guppy. I've been expecting you. Let's settle this... permanently.",
      },
    ],
    onEnd: 'map',
  },
};
