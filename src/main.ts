import "./styles.scss";
import { CardData, CardState, GameConfig, GameError, GameStatus } from "./types";





function shuffle<T>(arr: T[]): T[] {
const a = [...arr];
for (let i = a.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1));
[a[i], a[j]] = [a[j], a[i]]; 
}
return a;
}



function byId<T extends HTMLElement>(id: string): T {
const el = document.getElementById(id);
if (!el) throw new GameError(`Missing element #${id}`);
return el as T; 
}





class Entity { constructor(public id: number) {} }


class Card extends Entity implements CardData {
value: string;
state: CardState = CardState.FaceDown; // class property with default


constructor(id: number, value: string) {
super(id);
this.value = value;
}


get isMatchable(): boolean {
return this.state === CardState.FaceUp || this.state === CardState.FaceDown;
}
}


class Deck {
private cards: Card[] = [];
// Quick lookup via Map (additional data structure)
private index: Map<number, Card> = new Map();


constructor(values: string[]) {
// Build pairs, map/filter/forEach usage
const duplicated = values.flatMap((v, idx) => [new Card(idx * 2, v), new Card(idx * 2 + 1, v)]);
this.cards = shuffle(duplicated);
this.cards.forEach(c => this.index.set(c.id, c));
}


all(): Card[] { return this.cards; }
get(id: number): Card { const c = this.index.get(id); if (!c) throw new GameError("Card not found"); return c; }
reset(values: string[]) { this.cards = shuffle(values.flatMap((v, idx) => [new Card(idx * 2, v), new Card(idx * 2 + 1, v)])); this.index.clear(); this.cards.forEach(c => this.index.set(c.id, c)); }
}


class Game {
status: GameStatus = GameStatus.Idle;
attemptsLeft: number;
private readonly maxAttempts: number;
private readonly pairs: number;
private deck: Deck;
private selected: Card[] = [];
start();