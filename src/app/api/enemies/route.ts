import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"
import { EnemyDefSchema } from "@/lib/game/units/data/enemy-schema.helper"
import type { EnemyDef } from "@/lib/game/units/models"

const DB_PATH = path.join(process.cwd(), "src", "lib", "game", "units", "data", "enemy-database.json")

function readDb(): EnemyDef[] {
  if (!fs.existsSync(DB_PATH)) return []
  const raw = fs.readFileSync(DB_PATH, "utf-8")
  const parsed = JSON.parse(raw)
  return Array.isArray(parsed.enemies) ? parsed.enemies : []
}

function writeDb(enemies: EnemyDef[]): void {
  const data = JSON.stringify({ enemies }, null, 2)
  fs.writeFileSync(DB_PATH, data, "utf-8")
}

export async function GET() {
  const enemies = readDb()
  return NextResponse.json(enemies)
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

  const result = EnemyDefSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: "Validation failed", issues: result.error.issues }, { status: 400 })
  }

  const enemy = result.data
  const enemies = readDb()
  const idx = enemies.findIndex((e) => e.id === enemy.id)

  if (idx >= 0) {
    enemies[idx] = enemy
  } else {
    enemies.push(enemy)
  }

  writeDb(enemies)

  return NextResponse.json({ ok: true, id: enemy.id })
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

  const enemies = readDb()
  const idx = enemies.findIndex((e) => e.id === id)
  if (idx < 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  enemies.splice(idx, 1)
  writeDb(enemies)

  return NextResponse.json({ ok: true })
}