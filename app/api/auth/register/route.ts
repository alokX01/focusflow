import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import clientPromise from "@/lib/mongodb"
import type { UserDoc } from "@/lib/models"

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("focusflow")
    const users = db.collection<UserDoc>("users")

    const existing = await users.findOne({ email })
    const hashed = await bcrypt.hash(password, 10)

    if (existing) {
      // If user exists via OAuth (no password yet), allow setting a password
      if (!existing.password) {
        await users.updateOne(
          { _id: existing._id },
          { $set: { name: name || existing.name || null, password: hashed } }
        )
        return NextResponse.json({ ok: true })
      }
      return NextResponse.json({ error: "User already exists" }, { status: 409 })
    }

    await users.insertOne({
      name: name || null,
      email,
      image: null,
      password: hashed,
      emailVerified: null,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("POST /api/auth/register error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}