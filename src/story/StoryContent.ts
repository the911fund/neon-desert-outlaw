import type { Mission } from './Mission';

export const STORY_MISSIONS: Mission[] = [
  // === Chapter 1: The Newcomer ===
  {
    id: 'first_run',
    title: 'First Run',
    chapter: 1,
    chapterTitle: 'The Newcomer',
    briefing: [
      { speaker: 'DISPATCH', text: 'Welcome to the Neon Desert. Lets see what youve got.' },
      { speaker: 'DISPATCH', text: 'Hit the checkpoints. Nice and easy.' },
    ],
    objectives: { type: 'reach_checkpoints' },
    checkpoints: [
      [300, -50],
      [600, -120],
      [350, -250],
    ],
    completionDialogue: [
      { speaker: 'DISPATCH', text: 'Not bad, rookie. Not bad at all.' },
    ],
  },
  {
    id: 'outpost_run',
    title: 'Outpost Run',
    chapter: 1,
    chapterTitle: 'The Newcomer',
    briefing: [
      { speaker: 'DISPATCH', text: 'Theres a package for the fuel station. Dont ask whats inside.' },
      { speaker: 'DISPATCH', text: 'Head east. You cant miss it.' },
    ],
    objectives: { type: 'reach_checkpoints' },
    checkpoints: [
      [1200, -80],
    ],
    completionDialogue: [
      { speaker: 'DISPATCH', text: 'Delivered. The station owes us one.' },
    ],
  },
  {
    id: 'prove_yourself',
    title: 'Prove Yourself',
    chapter: 1,
    chapterTitle: 'The Newcomer',
    briefing: [
      { speaker: 'DISPATCH', text: 'Locals dont trust outsiders. Show them what you can do.' },
      { speaker: 'DISPATCH', text: 'Five checkpoints. Clock is ticking.' },
    ],
    objectives: { type: 'timed_delivery', timeLimit: 60 },
    checkpoints: [
      [400, 0],
      [800, -100],
      [600, -400],
      [200, -300],
      [-200, -100],
    ],
    completionDialogue: [
      { speaker: 'DISPATCH', text: 'You shut them up real quick. Welcome aboard.' },
    ],
  },

  // === Chapter 2: Rising Heat ===
  {
    id: 'off_the_grid',
    title: 'Off the Grid',
    chapter: 2,
    chapterTitle: 'Rising Heat',
    briefing: [
      { speaker: 'DISPATCH', text: 'Stay off the roads. Theyre being watched.' },
      { speaker: 'DISPATCH', text: 'Sand and gravel only. Got it?' },
    ],
    objectives: { type: 'offroad_only' },
    checkpoints: [
      [200, -400],
      [600, -600],
      [-200, -700],
      [-500, -300],
    ],
    completionDialogue: [
      { speaker: 'DISPATCH', text: 'Ghost run. Nobody saw a thing.' },
    ],
  },
  {
    id: 'storm_run',
    title: 'Storm Run',
    chapter: 2,
    chapterTitle: 'Rising Heat',
    briefing: [
      { speaker: 'DISPATCH', text: 'Storms rolling in. Move fast.' },
      { speaker: 'DISPATCH', text: 'Six stops. Ninety seconds. Go.' },
    ],
    objectives: { type: 'timed_delivery', timeLimit: 90 },
    checkpoints: [
      [300, -100],
      [700, -200],
      [1100, -150],
      [900, -500],
      [400, -600],
      [0, -350],
    ],
    completionDialogue: [
      { speaker: 'DISPATCH', text: 'Beat the storm. Youre getting good at this.' },
    ],
  },
  {
    id: 'the_gauntlet',
    title: 'The Gauntlet',
    chapter: 2,
    chapterTitle: 'Rising Heat',
    briefing: [
      { speaker: 'DISPATCH', text: 'This is the real test. Ten checkpoints, two minutes.' },
      { speaker: 'DISPATCH', text: 'Dont choke.' },
    ],
    objectives: { type: 'timed_delivery', timeLimit: 120 },
    checkpoints: [
      [300, 0],
      [700, -80],
      [1100, -200],
      [1400, -500],
      [1100, -800],
      [700, -900],
      [300, -750],
      [-100, -500],
      [-400, -200],
      [-200, 50],
    ],
    completionDialogue: [
      { speaker: 'DISPATCH', text: 'You ran the gauntlet. Respect.' },
    ],
  },

  // === Chapter 3: The Outlaw ===
  {
    id: 'canyon_run',
    title: 'Canyon Run',
    chapter: 3,
    chapterTitle: 'The Outlaw',
    briefing: [
      { speaker: 'DISPATCH', text: 'Youve earned some respect. Now earn your name.' },
      { speaker: 'DISPATCH', text: 'Wide route through the canyons. Show them speed.' },
    ],
    objectives: { type: 'reach_checkpoints' },
    checkpoints: [
      [500, -100],
      [1200, -300],
      [1800, -200],
      [2000, -600],
      [1500, -900],
      [800, -800],
      [200, -600],
      [-300, -300],
    ],
    completionDialogue: [
      { speaker: 'DISPATCH', text: 'They know your name now. The Neon Desert Outlaw.' },
    ],
  },
  {
    id: 'final_run',
    title: 'Final Run',
    chapter: 3,
    chapterTitle: 'The Outlaw',
    briefing: [
      { speaker: 'DISPATCH', text: 'One last ride. Make it count.' },
      { speaker: 'DISPATCH', text: 'Full circuit. Every outpost. Lets end this.' },
    ],
    objectives: { type: 'reach_checkpoints' },
    checkpoints: [
      [400, 0],
      [900, -80],
      [1400, -200],
      [1900, -150],
      [2200, -500],
      [1800, -800],
      [1200, -950],
      [600, -850],
      [100, -700],
      [-400, -500],
      [-600, -200],
      [-300, 100],
    ],
    completionDialogue: [
      { speaker: 'DISPATCH', text: 'Its done. You are the Neon Desert Outlaw.' },
      { speaker: 'DISPATCH', text: 'The desert is yours. Ride free.' },
    ],
  },
];
