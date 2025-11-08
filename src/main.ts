import "./styles.scss";
import {
  CardData,
  CardState,
  GameConfig,
  GameError,
  GameStatus,
} from "./types";

/**********************
 * Utility functions  *
 **********************/

// Fisher–Yates shuffle (array destructuring swap)
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Type assertion helper
function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new GameError(`Missing element #${id}`);
  return el as T;
}

/**********************
 * Model layer (OOP)  *
 **********************/

class Entity {
  constructor(public id: number) {}
}

class Card extends Entity implements CardData {
  value: string;
  state: CardState = CardState.FaceDown; // default class property

  constructor(id: number, value: string) {
    super(id);
    this.value = value;
  }
}

class Deck {
  private cards: Card[] = [];
  private index: Map<number, Card> = new Map(); // data structure Map

  constructor(values: string[]) {
    const duplicated = values.flatMap((v, idx) => [
      new Card(idx * 2, v),
      new Card(idx * 2 + 1, v),
    ]);
    this.cards = shuffle(duplicated);
    this.cards.forEach((c) => this.index.set(c.id, c));
  }

  all(): Card[] {
    return this.cards;
  }

  get(id: number): Card {
    const c = this.index.get(id);
    if (!c) throw new GameError("Card not found");
    return c;
  }

  reset(values: string[]) {
    this.cards = shuffle(
      values.flatMap((v, idx) => [
        new Card(idx * 2, v),
        new Card(idx * 2 + 1, v),
      ])
    );
    this.index.clear();
    this.cards.forEach((c) => this.index.set(c.id, c));
  }
}

class Game {
  status: GameStatus = GameStatus.Idle;
  attemptsLeft!: number;
  private readonly maxAttempts!: number;
  private readonly pairs!: number;
  private deck!: Deck;
  private selected: Card[] = [];

  constructor(cfg: GameConfig) {
    // destructuring with default value
    const { pairs, maxAttempts, values = ["A", "B", "C", "D", "E", "F"] } = cfg;
    if (pairs < 1) throw new GameError("At least one pair required");
    this.pairs = pairs;
    this.maxAttempts = maxAttempts;
    this.attemptsLeft = maxAttempts;

    // array methods: filter, map, sort
    const chosen = values
      .filter((_, i) => i < pairs)
      .map((v) => String(v))
      .sort((a, b) => a.localeCompare(b));

    this.deck = new Deck(chosen);
  }

  public start(): void {
    this.status = GameStatus.Playing;
    this.attemptsLeft = this.maxAttempts;
    this.selected = [];
  }

  public getCards(): Card[] {
    return this.deck.all();
  }

  public flip(id: number): Card {
    if (this.status !== GameStatus.Playing)
      throw new GameError("Game not in PLAYING state");

    const card = this.deck.get(id);
    if (card.state === CardState.Matched)
      throw new GameError("Card already matched");
    if (this.selected.includes(card)) return card; // ignore duplicate clicks

    card.state = CardState.FaceUp;
    this.selected.push(card);

    if (this.selected.length === 2) {
      this.evaluateTurn();
    }

    return card;
  }

  private evaluateTurn(): void {
    // object destructuring with renaming
    const [{ value: aVal, id: aId }, { value: bVal, id: bId }] = this
      .selected as [Card, Card];

    if (aVal === bVal && aId !== bId) {
      this.selected.forEach((c) => (c.state = CardState.Matched));
      const remaining = this.getCards().filter(
        (c) => c.state !== CardState.Matched
      );
      if (remaining.length === 0) this.status = GameStatus.Won;
    } else {
      this.attemptsLeft -= 1;
      const [first, second] = this.selected; // array destructuring
      setTimeout(() => {
        first.state = CardState.FaceDown;
        second.state = CardState.FaceDown;
      }, 450);
      if (this.attemptsLeft <= 0) this.status = GameStatus.Lost;
    }
    this.selected = [];
  }

  public reset(values?: string[]): void {
    const pool = values && values.length >= this.pairs ? values : undefined;
    const finalValues =
      pool ??
      this.getCards()
        .slice(0, this.pairs)
        .map((c) => c.value);
    this.deck.reset(finalValues);
    this.start();
  }
}

/************************
 * View/Controller (UI) *
 ************************/

const attemptsEl = byId<HTMLSpanElement>("attempts");
const board = byId<HTMLDivElement>("board");
const statusWrap = byId<HTMLDivElement>("status");
const statusText = byId<HTMLHeadingElement>("statusText");
const restartBtn = byId<HTMLButtonElement>("restart");

// nested destructuring & default value param
function renderCard(
  { id, value, state }: CardData,
  refs: { map: Map<number, HTMLElement> } = { map: new Map() }
): HTMLElement {
  const cardEl = document.createElement("button");
  cardEl.className = `card ${state.toLowerCase()}`;
  cardEl.setAttribute("data-id", String(id));
  cardEl.setAttribute("aria-label", `Card ${id}`);
  cardEl.innerHTML = `<span class="front">${value}</span><span class="back" aria-hidden="true"></span>`;
  refs.map.set(id, cardEl);
  return cardEl;
}

function updateAttempts(n: number): void {
  attemptsEl.textContent = String(n);
}

function setStatus(status: GameStatus): void {
  if (status === GameStatus.Playing) {
    statusWrap.hidden = true;
    return;
  }
  statusWrap.hidden = false;
  statusText.textContent = status === GameStatus.Won ? "You Won!" : "Game Over";
}

// setup game (3 pairs, 3 attempts)
const game = new Game({
  pairs: 3,
  maxAttempts: 3,
  values: ["A", "B", "C", "🍋", "🍊", "🍉"],
});

// skipping array items example
const sample = ["x", "y", "z", "w"];
const [first, , third] = sample; // skip "y"
void first;
void third;

function buildBoard(cards: Card[]): void {
  board.innerHTML = "";
  const elementIndex = new Map<number, HTMLElement>();
  const nodes = cards.map((c) => renderCard(c, { map: elementIndex }));
  nodes.forEach((n) => board.appendChild(n));

  board.onclick = (ev) => {
    const target = ev.target as HTMLElement;
    const btn = target.closest(".card") as HTMLElement | null;
    if (!btn) return;
    const id = Number(btn.dataset.id);
    try {
      const before = game.getCards().find((c) => c.id === id);
      if (
        !before ||
        before.state === CardState.Matched ||
        before.state === CardState.FaceUp
      )
        return;

      game.flip(id);

      const card = game.getCards().find((c) => c.id === id)!;
      const node = elementIndex.get(id)!;
      node.classList.toggle("face_up", card.state === CardState.FaceUp);
      node.classList.toggle("matched", card.state === CardState.Matched);

      setTimeout(() => {
        game.getCards().forEach(({ id: cid, state }) => {
          const el = elementIndex.get(cid);
          if (!el) return;
          el.classList.toggle("face_up", state === CardState.FaceUp);
          el.classList.toggle("matched", state === CardState.Matched);
        });
        updateAttempts(game.attemptsLeft);
        setStatus(game.status);
      }, 500);
    } catch (e) {
      if (e instanceof GameError) console.error(e.message);
      else throw e;
    }
  };
}

function start(): void {
  game.start();
  buildBoard(game.getCards());
  updateAttempts(game.attemptsLeft);
  setStatus(game.status);
}

restartBtn.addEventListener("click", () => start());

start();
