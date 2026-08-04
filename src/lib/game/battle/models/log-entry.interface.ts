export interface LogEntry {
  id: number
  turn: number
  text: string
  tone: "neutral" | "good" | "bad" | "gold"
}
