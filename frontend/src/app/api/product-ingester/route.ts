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

// GET handler — triggered by Vercel Cron or manual check
// When called without params, triggers a default ingestion run
export async function GET(request: NextRequest) {
  const isCron = request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
  const trigger = request.nextUrl.searchParams.get("run");

  // If triggered by Vercel Cron or ?run=true, fire a default ingestion
  if (isCron || trigger === "true") {
    try {
      const res = await fetch(`${BACKEND_URL}/api/product-ingester`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Default queries — rotate categories each run based on day of week
          queries: getQueriesForToday(),
          pages_per_query: 2,
          source: "off",
        }),
      });
      const data = await res.json();
      return NextResponse.json({ triggered: true, ...data });
    } catch (err) {
      return NextResponse.json(
        { success: false, error: "Backend connection failed" },
        { status: 502 }
      );
    }
  }

  // Otherwise just return status
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

// Rotate through product categories based on day of week
function getQueriesForToday(): string[] {
  const day = new Date().getDay(); // 0=Sun, 1=Mon, ...
  const categories: string[][] = [
    // Sunday — durable plastics
    ["plastic storage bin", "laundry basket plastic", "trash can plastic", "plastic hangers", "shower caddy",
     "plastic drawer organizer", "plastic shelving unit", "resin outdoor chair", "plastic bins walmart",
     "sterilite storage", "rubbermaid container", "hefty storage", "iris storage", "plastic tote"],
    // Monday — baby & kids
    ["baby toy plastic", "teething ring bpa free", "sippy cup material", "baby play mat",
     "highchair plastic", "baby bottle material", "kids plastic plate", "baby gate material",
     "baby bath tub plastic", "baby walker material", "lego bricks material", "plastic baby toys"],
    // Tuesday — kitchen durables
    ["cutting board material", "food storage container plastic", "water bottle bpa free material",
     "tupperware material", "lunch box material", "plastic wrap composition", "ziplock bag material",
     "silicone baking mat", "plastic measuring cups", "plastic colander material"],
    // Wednesday — textiles & apparel
    ["polyester shirt material", "nylon jacket composition", "acrylic sweater material",
     "spandex leggings material", "microfiber towel material", "polyester bedding composition",
     "synthetic fleece material", "waterproof jacket pfas", "yoga pants material composition",
     "fast fashion polyester", "cotton polyester blend shirt"],
    // Thursday — home textiles & bath
    ["shower curtain pvc material", "bath mat material", "synthetic rug material",
     "polyester curtains material", "memory foam pillow material", "mattress protector material",
     "microfiber sheet material", "comforter polyester fill"],
    // Friday — food packaging & single-use
    ["styrofoam container material", "plastic utensils material", "food packaging material",
     "cling wrap material", "aluminum foil alternative", "paper plate coating material",
     "plastic straw material", "takeout container material", "produce bag material"],
    // Saturday — bio alternatives
    ["bamboo storage container", "glass food container", "stainless steel water bottle",
     "beeswax wrap", "hemp bag material", "organic cotton bedding", "bamboo cutting board",
     "stasher bag silicone", "grove collaborative products", "blueland cleaning", "public goods material",
     "wool dryer balls", "natural rubber products", "cork material products"],
  ];
  return categories[day] || categories[0];
}
