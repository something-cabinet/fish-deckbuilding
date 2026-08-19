import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"

const SPRITES_DIR = path.join(process.cwd(), "public", "sprites")
const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"])

function listSpriteNames(): string[] {
  if (!fs.existsSync(SPRITES_DIR)) return []
  return fs
    .readdirSync(SPRITES_DIR)
    .filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()))
    .map((f) => path.basename(f, path.extname(f)))
    .sort((a, b) => a.localeCompare(b))
}

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json(listSpriteNames())
}
