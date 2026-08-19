import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"
import { CharacterDefSchema } from "@/lib/game/characters/data/character-schema.helper"
import type { CharacterDef } from "@/lib/game/characters"

const DB_PATH = path.join(
  process.cwd(),
  "src",
  "lib",
  "game",
  "characters",
  "data",
  "character-database.json",
)

function readDb(): CharacterDef[] {
  if (!fs.existsSync(DB_PATH)) return []
  const raw = fs.readFileSync(DB_PATH, "utf-8")
  const parsed = JSON.parse(raw)
  return Array.isArray(parsed.characters) ? parsed.characters : []
}

function writeDb(characters: CharacterDef[]): void {
  const data = JSON.stringify({ characters }, null, 2)
  fs.writeFileSync(DB_PATH, data, "utf-8")
}

export async function GET() {
  const characters = readDb()
  return NextResponse.json(characters)
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

  const result = CharacterDefSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 },
    )
  }

  const character = result.data
  const characters = readDb()
  const idx = characters.findIndex((c) => c.id === character.id)

  if (idx >= 0) {
    characters[idx] = character
  } else {
    characters.push(character)
  }

  writeDb(characters)

  return NextResponse.json({ ok: true, id: character.id })
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

  const characters = readDb()
  const idx = characters.findIndex((c) => c.id === id)
  if (idx < 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // the first character is what a run defaults to — deleting the last one
  // would leave the game with no hero to build
  if (characters.length === 1) {
    return NextResponse.json({ error: "Cannot delete the last character" }, { status: 409 })
  }

  characters.splice(idx, 1)
  writeDb(characters)

  return NextResponse.json({ ok: true })
}
