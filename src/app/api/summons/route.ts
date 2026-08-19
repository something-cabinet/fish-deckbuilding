import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"
import { SummonDefSchema } from "@/lib/game/summons/data/summon-schema.helper"
import type { SummonDef } from "@/lib/game/summons"

const DB_PATH = path.join(
  process.cwd(),
  "src",
  "lib",
  "game",
  "summons",
  "data",
  "summon-database.json",
)

function readDb(): SummonDef[] {
  if (!fs.existsSync(DB_PATH)) return []
  const raw = fs.readFileSync(DB_PATH, "utf-8")
  const parsed = JSON.parse(raw)
  return Array.isArray(parsed.summons) ? parsed.summons : []
}

function writeDb(summons: SummonDef[]): void {
  const data = JSON.stringify({ summons }, null, 2)
  fs.writeFileSync(DB_PATH, data, "utf-8")
}

export async function GET() {
  const summons = readDb()
  return NextResponse.json(summons)
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

  const result = SummonDefSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 },
    )
  }

  const summon = result.data
  const summons = readDb()
  const idx = summons.findIndex((s) => s.id === summon.id)

  if (idx >= 0) {
    summons[idx] = summon
  } else {
    summons.push(summon)
  }

  writeDb(summons)

  return NextResponse.json({ ok: true, id: summon.id })
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

  const summons = readDb()
  const idx = summons.findIndex((s) => s.id === id)
  if (idx < 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  summons.splice(idx, 1)
  writeDb(summons)

  return NextResponse.json({ ok: true })
}
