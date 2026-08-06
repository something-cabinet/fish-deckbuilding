import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"
import { StageDefSchema } from "@/lib/game/stages/data/stage-schema.helper"
import type { StageDef } from "@/lib/game/stages/models"

const DB_PATH = path.join(process.cwd(), "src", "lib", "game", "stages", "data", "stage-database.json")

function readDb(): StageDef[] {
  if (!fs.existsSync(DB_PATH)) return []
  const raw = fs.readFileSync(DB_PATH, "utf-8")
  const parsed = JSON.parse(raw)
  return Array.isArray(parsed.stages) ? parsed.stages : []
}

function writeDb(stages: StageDef[]): void {
  const data = JSON.stringify({ stages }, null, 2)
  fs.writeFileSync(DB_PATH, data, "utf-8")
}

export async function GET() {
  const stages = readDb()
  return NextResponse.json(stages)
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

  const result = StageDefSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: "Validation failed", issues: result.error.issues }, { status: 400 })
  }

  const stage = result.data
  const stages = readDb()
  const idx = stages.findIndex((s) => s.id === stage.id)

  if (idx >= 0) {
    stages[idx] = stage
  } else {
    stages.push(stage)
  }

  writeDb(stages)

  return NextResponse.json({ ok: true, id: stage.id })
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

  const stages = readDb()
  const idx = stages.findIndex((s) => s.id === id)
  if (idx < 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  stages.splice(idx, 1)
  writeDb(stages)

  return NextResponse.json({ ok: true })
}
