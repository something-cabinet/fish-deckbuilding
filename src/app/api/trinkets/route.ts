import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"
import { TrinketDefSchema } from "@/lib/game/trinkets/data/trinket-schema.helper"
import type { TrinketDef } from "@/lib/game/trinkets"

const DB_PATH = path.join(
  process.cwd(),
  "src",
  "lib",
  "game",
  "trinkets",
  "data",
  "trinket-database.json",
)

function readDb(): TrinketDef[] {
  if (!fs.existsSync(DB_PATH)) return []
  const raw = fs.readFileSync(DB_PATH, "utf-8")
  const parsed = JSON.parse(raw)
  return Array.isArray(parsed.trinkets) ? parsed.trinkets : []
}

function writeDb(trinkets: TrinketDef[]): void {
  const data = JSON.stringify({ trinkets }, null, 2)
  fs.writeFileSync(DB_PATH, data, "utf-8")
}

export async function GET() {
  const trinkets = readDb()
  return NextResponse.json(trinkets)
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

  const result = TrinketDefSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 },
    )
  }

  const trinket = result.data
  const trinkets = readDb()
  const idx = trinkets.findIndex((t) => t.id === trinket.id)

  if (idx >= 0) {
    trinkets[idx] = trinket
  } else {
    trinkets.push(trinket)
  }

  writeDb(trinkets)

  return NextResponse.json({ ok: true, id: trinket.id })
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

  const trinkets = readDb()
  const idx = trinkets.findIndex((t) => t.id === id)
  if (idx < 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  trinkets.splice(idx, 1)
  writeDb(trinkets)

  return NextResponse.json({ ok: true })
}
