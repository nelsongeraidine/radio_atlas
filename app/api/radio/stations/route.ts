import { NextRequest, NextResponse } from "next/server";
import { getStationsByCountryState } from "@/lib/radio-api/client";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const countryCode = searchParams.get("countryCode");
  const city = searchParams.get("city");

  if (!countryCode || !city) {
    return NextResponse.json({ error: "countryCode and city query params are required" }, { status: 400 });
  }

  try {
    const stations = await getStationsByCountryState(countryCode, city);
    return NextResponse.json(stations);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch stations", detail: String(err) }, { status: 502 });
  }
}
