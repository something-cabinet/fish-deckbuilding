import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"

const CARD_ART_DIR = path.join(process.cwd(), "public", "card-art")
const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"])

function listCardArtNames(): string[] {
  if (!fs.existsSync(CARD_ART_DIR)) return []
  return fs
    .readdirSync(CARD_ART_DIR)
    .filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()))
    .map((f) => path.basename(f, path.extname(f)))
    .sort((a, b) => a.localeCompare(b))
}

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json(listCardArtNames())
}
