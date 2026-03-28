import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "https://biolens-kappa.vercel.app";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/product-ingester`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Backend connection failed" },
      { status: 502 }
    );
  }
}

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/product-ingester`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Backend connection failed" },
      { status: 502 }
    );
  }
}
