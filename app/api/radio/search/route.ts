import { NextRequest, NextResponse } from "next/server";
import { searchStationsByName } from "@/lib/radio-api/client";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length === 0) {
    return NextResponse.json({ error: "q query param is required" }, { status: 400 });
  }

  try {
    const stations = await searchStationsByName(q);
    return NextResponse.json(stations);
  } catch (err) {
    return NextResponse.json({ error: "Failed to search stations", detail: String(err) }, { status: 502 });
  }
}
