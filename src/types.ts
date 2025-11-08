// Enumerations 
export enum GameStatus {
Idle = "IDLE",
Playing = "PLAYING",
Won = "WON",
Lost = "LOST",
}


export enum CardState {
FaceDown = "FACE_DOWN",
FaceUp = "FACE_UP",
Matched = "MATCHED",
}


// Custom error class 
export class GameError extends Error {
constructor(message: string) {
super(message);
this.name = "GameError";
}
}


export type CardValue = string; 


export interface CardData {
id: number;
value: CardValue;
state: CardState;
}


export interface GameConfig {
pairs: number; // 3 pairs => 6 cards
maxAttempts: number; // 3 attempts
values?: CardValue[]; // optional custom values
}