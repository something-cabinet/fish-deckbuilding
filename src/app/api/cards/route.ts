import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"
import { CardDefSchema } from "@/lib/game/cards/data/schema.helper"
import type { CardDef } from "@/lib/game/cards/models"

const DB_PATH = path.join(process.cwd(), "src", "lib", "game", "cards", "card-database.json")

function readDb(): CardDef[] {
  if (!fs.existsSync(DB_PATH)) return []
  const raw = fs.readFileSync(DB_PATH, "utf-8")
  const parsed = JSON.parse(raw)
  return Array.isArray(parsed.cards) ? parsed.cards : []
}

function writeDb(cards: CardDef[]): void {
  const data = JSON.stringify({ cards }, null, 2)
  fs.writeFileSync(DB_PATH, data, "utf-8")
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const result = CardDefSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: "Validation failed", issues: result.error.issues }, { status: 400 })
  }

  const card = result.data
  const cards = readDb()
  const idx = cards.findIndex((c) => c.id === card.id)

  if (idx >= 0) {
    cards[idx] = card
  } else {
    cards.push(card)
  }

  writeDb(cards)

  return NextResponse.json({ ok: true, id: card.id })
}

export async function DELETE(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "Missing ?id=" }, { status: 400 })
  }

  const cards = readDb()
  const idx = cards.findIndex((c) => c.id === id)
  if (idx < 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  cards.splice(idx, 1)
  writeDb(cards)

  return NextResponse.json({ ok: true })
}