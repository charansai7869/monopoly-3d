import type { CardDef } from './types.js';

// Standard 16 Chance + 16 Community Chest cards.
export const CHANCE: CardDef[] = [
  { id: 'ch1', deck: 'chance', text: 'Advance to GO. Collect $200.', effect: { type: 'moveTo', idx: 0, collectGo: true } },
  { id: 'ch2', deck: 'chance', text: 'Advance to Chandigarh.', effect: { type: 'moveTo', idx: 24, collectGo: true } },
  { id: 'ch3', deck: 'chance', text: 'Advance to Nagpur.', effect: { type: 'moveTo', idx: 11, collectGo: true } },
  { id: 'ch4', deck: 'chance', text: 'Advance to the nearest Utility.', effect: { type: 'nearestUtility' } },
  { id: 'ch5', deck: 'chance', text: 'Advance to the nearest Railroad.', effect: { type: 'nearestRailroad' } },
  { id: 'ch6', deck: 'chance', text: 'Bank pays you dividend of $50.', effect: { type: 'money', amount: 50 } },
  { id: 'ch7', deck: 'chance', text: 'Get Out of Jail Free.', effect: { type: 'getOutOfJailFree' } },
  { id: 'ch8', deck: 'chance', text: 'Go back 3 spaces.', effect: { type: 'moveBy', steps: -3 } },
  { id: 'ch9', deck: 'chance', text: 'Go to Jail. Do not pass GO.', effect: { type: 'goToJail' } },
  { id: 'ch10', deck: 'chance', text: 'Make general repairs: $25 per house, $100 per hotel.', effect: { type: 'repairs', perHouse: 25, perHotel: 100 } },
  { id: 'ch11', deck: 'chance', text: 'Speeding fine $15.', effect: { type: 'money', amount: -15 } },
  { id: 'ch12', deck: 'chance', text: 'Advance to Mumbai Airport.', effect: { type: 'moveTo', idx: 5, collectGo: true } },
  { id: 'ch13', deck: 'chance', text: 'Advance to Marine Drive.', effect: { type: 'moveTo', idx: 39, collectGo: false } },
  { id: 'ch14', deck: 'chance', text: 'You have been elected Chairman. Pay each player $50.', effect: { type: 'payEachPlayer', amount: 50 } },
  { id: 'ch15', deck: 'chance', text: 'Your building loan matures. Collect $150.', effect: { type: 'money', amount: 150 } },
  { id: 'ch16', deck: 'chance', text: 'You won a state lottery. Collect $100.', effect: { type: 'money', amount: 100 } },
];

export const CHEST: CardDef[] = [
  { id: 'cc1', deck: 'chest', text: 'Advance to GO. Collect $200.', effect: { type: 'moveTo', idx: 0, collectGo: true } },
  { id: 'cc2', deck: 'chest', text: 'Bank error in your favor. Collect $200.', effect: { type: 'money', amount: 200 } },
  { id: 'cc3', deck: 'chest', text: "Doctor's fee. Pay $50.", effect: { type: 'money', amount: -50 } },
  { id: 'cc4', deck: 'chest', text: 'From sale of stock you get $50.', effect: { type: 'money', amount: 50 } },
  { id: 'cc5', deck: 'chest', text: 'Get Out of Jail Free.', effect: { type: 'getOutOfJailFree' } },
  { id: 'cc6', deck: 'chest', text: 'Go to Jail. Do not pass GO.', effect: { type: 'goToJail' } },
  { id: 'cc7', deck: 'chest', text: 'Holiday fund matures. Receive $100.', effect: { type: 'money', amount: 100 } },
  { id: 'cc8', deck: 'chest', text: 'Income tax refund. Collect $20.', effect: { type: 'money', amount: 20 } },
  { id: 'cc9', deck: 'chest', text: "It's your birthday. Collect $10 from every player.", effect: { type: 'collectEachPlayer', amount: 10 } },
  { id: 'cc10', deck: 'chest', text: 'Life insurance matures. Collect $100.', effect: { type: 'money', amount: 100 } },
  { id: 'cc11', deck: 'chest', text: 'Pay hospital fees of $100.', effect: { type: 'money', amount: -100 } },
  { id: 'cc12', deck: 'chest', text: 'Pay school fees of $50.', effect: { type: 'money', amount: -50 } },
  { id: 'cc13', deck: 'chest', text: 'Receive $25 consultancy fee.', effect: { type: 'money', amount: 25 } },
  { id: 'cc14', deck: 'chest', text: 'Street repairs: $40 per house, $115 per hotel.', effect: { type: 'repairs', perHouse: 40, perHotel: 115 } },
  { id: 'cc15', deck: 'chest', text: 'Won second prize in beauty contest. Collect $10.', effect: { type: 'money', amount: 10 } },
  { id: 'cc16', deck: 'chest', text: 'You inherit $100.', effect: { type: 'money', amount: 100 } },
];

export const CARD_BY_ID: Record<string, CardDef> = Object.fromEntries(
  [...CHANCE, ...CHEST].map((c) => [c.id, c]),
);
