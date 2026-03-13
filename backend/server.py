from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Supabase config for barcode cache
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ─── Material Rules Database ────────────────────────────────────────────────

MATERIAL_CATEGORIES = {
    "petro-based": {"label": "Petro-Based", "risk": "High", "color": "#BE123C"},
    "plant-based": {"label": "Plant-Based", "risk": "Low", "color": "#15803d"},
    "transition": {"label": "Transition Material", "risk": "Medium", "color": "#F59E0B"},
    "natural": {"label": "Natural Material", "risk": "Low", "color": "#15803d"},
    "mineral": {"label": "Mineral Material", "risk": "Low", "color": "#15803d"},
    "mixed": {"label": "Mixed / Unknown", "risk": "Medium", "color": "#F59E0B"},
}

MATERIALS_DB = {
    "polyester": {
        "name": "Polyester",
        "slug": "polyester",
        "category": "petro-based",
        "description": "A petroleum-derived synthetic fiber commonly used in clothing and home textiles.",
        "explanation": "Polyester is a petroleum-derived synthetic fiber. It is commonly used in apparel because it is cheap and durable, but it sheds microplastics and depends on fossil feedstocks.",
        "alternatives": ["hemp", "linen", "wool", "organic cotton"],
    },
    "nylon": {
        "name": "Nylon",
        "slug": "nylon",
        "category": "petro-based",
        "description": "A strong petroleum-based synthetic used in clothing, rope, and industrial products.",
        "explanation": "Nylon is derived from petroleum through a chemical synthesis process. It is strong and elastic but non-biodegradable and energy-intensive to produce.",
        "alternatives": ["hemp", "wool", "silk", "linen"],
    },
    "acrylic": {
        "name": "Acrylic",
        "slug": "acrylic",
        "category": "petro-based",
        "description": "A petroleum-based synthetic fiber often used as a wool substitute.",
        "explanation": "Acrylic is made from fossil-fuel-derived acrylonitrile. It mimics wool but sheds microplastics during washing and is not biodegradable.",
        "alternatives": ["wool", "alpaca", "organic cotton"],
    },
    "polypropylene": {
        "name": "Polypropylene",
        "slug": "polypropylene",
        "category": "petro-based",
        "description": "A lightweight petroleum-based plastic used in packaging, textiles, and containers.",
        "explanation": "Polypropylene is a thermoplastic polymer made from propylene monomer, a fossil fuel byproduct. It is widely used in packaging and reusable containers but is not biodegradable.",
        "alternatives": ["bamboo", "wood", "cork", "glass"],
    },
    "polyethylene": {
        "name": "Polyethylene",
        "slug": "polyethylene",
        "category": "petro-based",
        "description": "The most common petroleum-based plastic, used in bags, bottles, and films.",
        "explanation": "Polyethylene is the world's most widely produced plastic, derived from ethylene gas. It takes hundreds of years to decompose and contributes to ocean pollution.",
        "alternatives": ["bamboo", "wood", "glass", "cork"],
    },
    "pvc": {
        "name": "PVC",
        "slug": "pvc",
        "category": "petro-based",
        "description": "A rigid petroleum-based plastic used in pipes, flooring, and packaging.",
        "explanation": "PVC (polyvinyl chloride) contains chlorine and petroleum derivatives. Manufacturing and disposal can release harmful dioxins. It is one of the most environmentally problematic plastics.",
        "alternatives": ["wood", "bamboo", "natural rubber", "cork"],
    },
    "plastic": {
        "name": "Plastic (Generic)",
        "slug": "plastic",
        "category": "petro-based",
        "description": "A broad category of petroleum-derived synthetic materials.",
        "explanation": "Most conventional plastics are made from petroleum or natural gas. They persist in the environment for centuries and break down into microplastics that contaminate ecosystems.",
        "alternatives": ["bamboo", "wood", "glass", "stainless steel", "cork"],
    },
    "hemp": {
        "name": "Hemp",
        "slug": "hemp",
        "category": "plant-based",
        "description": "A strong natural fiber used in textiles, rope, and composites.",
        "explanation": "Hemp is one of the most sustainable crops on the planet. It grows quickly, requires minimal water, and produces a strong, durable fiber used in textiles, paper, and building materials.",
        "alternatives": [],
    },
    "linen": {
        "name": "Linen",
        "slug": "linen",
        "category": "plant-based",
        "description": "A natural textile fiber made from the flax plant.",
        "explanation": "Linen is made from flax and is one of the oldest textile fibers. It is naturally biodegradable, breathable, and requires less water and pesticides than cotton.",
        "alternatives": [],
    },
    "bamboo": {
        "name": "Bamboo (Fiber)",
        "slug": "bamboo",
        "category": "plant-based",
        "description": "A fast-growing grass used for products, building, and mechanical textiles.",
        "explanation": "Bamboo fiber (mechanically processed) is a sustainable plant-based material. Bamboo grows rapidly without pesticides. However, be aware that chemically processed bamboo (rayon) is different.",
        "alternatives": [],
    },
    "cotton": {
        "name": "Cotton",
        "slug": "cotton",
        "category": "plant-based",
        "description": "A widely used natural fiber grown from the cotton plant.",
        "explanation": "Cotton is a natural, biodegradable fiber. Conventional cotton uses significant water and pesticides, but organic cotton reduces these impacts substantially.",
        "alternatives": ["organic cotton", "hemp", "linen"],
    },
    "organic cotton": {
        "name": "Organic Cotton",
        "slug": "organic-cotton",
        "category": "plant-based",
        "description": "Cotton grown without synthetic pesticides or fertilizers.",
        "explanation": "Organic cotton is grown using methods that have a lower environmental impact. It avoids synthetic pesticides and GMO seeds, promoting healthier soil and water systems.",
        "alternatives": [],
    },
    "cork": {
        "name": "Cork",
        "slug": "cork",
        "category": "plant-based",
        "description": "A renewable bark material harvested from cork oak trees.",
        "explanation": "Cork is harvested from the bark of cork oak trees without cutting them down. It is lightweight, waterproof, biodegradable, and the trees regenerate their bark naturally.",
        "alternatives": [],
    },
    "wood": {
        "name": "Wood",
        "slug": "wood",
        "category": "plant-based",
        "description": "A renewable natural material from trees used in construction and products.",
        "explanation": "Wood is a renewable, biodegradable material when sourced sustainably. FSC-certified wood ensures responsible forestry practices.",
        "alternatives": [],
    },
    "bamboo rayon": {
        "name": "Bamboo Rayon",
        "slug": "bamboo-rayon",
        "category": "transition",
        "description": "Made from bamboo cellulose but chemically processed into soft textile fibers.",
        "explanation": "Bamboo rayon starts as a plant-based material but undergoes heavy chemical processing to become a textile fiber. The chemicals used (like carbon disulfide) raise environmental and health concerns.",
        "alternatives": ["hemp", "linen", "organic cotton", "lyocell"],
    },
    "viscose": {
        "name": "Viscose",
        "slug": "viscose",
        "category": "transition",
        "description": "A semi-synthetic fiber made from wood pulp through chemical processing.",
        "explanation": "Viscose is made from wood or plant cellulose but requires toxic chemicals to process. It sits between natural and synthetic materials, with environmental impact depending on production methods.",
        "alternatives": ["lyocell", "hemp", "linen", "organic cotton"],
    },
    "modal": {
        "name": "Modal",
        "slug": "modal",
        "category": "transition",
        "description": "A semi-synthetic fiber made from beech tree pulp.",
        "explanation": "Modal is similar to viscose but uses a modified process that can be more eco-friendly. It is soft and breathable but still requires chemical processing of wood pulp.",
        "alternatives": ["lyocell", "organic cotton", "linen"],
    },
    "lyocell": {
        "name": "Lyocell",
        "slug": "lyocell",
        "category": "transition",
        "description": "A closed-loop semi-synthetic fiber made from wood pulp.",
        "explanation": "Lyocell (like Tencel) uses a closed-loop process that recycles almost all solvents. It is the most environmentally responsible of the regenerated cellulose fibers.",
        "alternatives": ["organic cotton", "hemp", "linen"],
    },
    "wool": {
        "name": "Wool",
        "slug": "wool",
        "category": "natural",
        "description": "A natural animal fiber from sheep, prized for warmth and durability.",
        "explanation": "Wool is a natural, renewable, and biodegradable fiber. It is naturally fire-resistant, moisture-wicking, and durable. Responsible sourcing ensures animal welfare.",
        "alternatives": [],
    },
    "silk": {
        "name": "Silk",
        "slug": "silk",
        "category": "natural",
        "description": "A natural protein fiber produced by silkworms.",
        "explanation": "Silk is a natural, biodegradable luxury fiber. Traditional production involves silkworms, while peace silk allows moths to emerge before harvesting.",
        "alternatives": [],
    },
    "natural rubber": {
        "name": "Natural Rubber",
        "slug": "natural-rubber",
        "category": "natural",
        "description": "An elastic material harvested from rubber tree sap.",
        "explanation": "Natural rubber comes from the sap of rubber trees and is biodegradable. It is a renewable alternative to synthetic petroleum-based rubbers.",
        "alternatives": [],
    },
    "glass": {
        "name": "Glass",
        "slug": "glass",
        "category": "mineral",
        "description": "A recyclable material made from sand, soda ash, and limestone.",
        "explanation": "Glass is made from abundant natural minerals and is infinitely recyclable without loss of quality. It is inert, non-toxic, and a sustainable alternative to plastic packaging.",
        "alternatives": [],
    },
    "ceramic": {
        "name": "Ceramic",
        "slug": "ceramic",
        "category": "mineral",
        "description": "A durable material made from clay fired at high temperatures.",
        "explanation": "Ceramic is made from natural clay and minerals. It is durable, non-toxic, and chemically inert, making it excellent for food storage and cookware.",
        "alternatives": [],
    },
    "steel": {
        "name": "Steel",
        "slug": "steel",
        "category": "mineral",
        "description": "A strong, recyclable alloy of iron and carbon.",
        "explanation": "Stainless steel is highly durable and infinitely recyclable. It is a long-lasting alternative to single-use plastics for water bottles, utensils, and containers.",
        "alternatives": [],
    },
    "silicone": {
        "name": "Silicone",
        "slug": "silicone",
        "category": "mixed",
        "description": "A synthetic material derived from silicon, oxygen, and other elements.",
        "explanation": "Silicone is derived partly from natural silicon (sand) but requires chemical processing. It is more durable and heat-resistant than plastic, and is considered a moderate alternative.",
        "alternatives": ["glass", "stainless steel", "natural rubber"],
    },
    "microfiber": {
        "name": "Microfiber",
        "slug": "microfiber",
        "category": "petro-based",
        "description": "Ultra-fine synthetic fibers typically made from polyester and nylon.",
        "explanation": "Microfiber is made from petroleum-derived polyester and nylon split into ultra-fine strands. It sheds significant amounts of microplastics during washing.",
        "alternatives": ["organic cotton", "linen", "hemp", "wool"],
    },
}

# Product-to-material mapping for common product queries
PRODUCT_MAPPINGS = {
    "polyester shirt": "polyester",
    "polyester hoodie": "polyester",
    "polyester jacket": "polyester",
    "synthetic fleece": "polyester",
    "fleece jacket": "polyester",
    "fleece blanket": "polyester",
    "plastic storage bin": "plastic",
    "plastic container": "plastic",
    "plastic toothbrush": "plastic",
    "plastic cutting board": "polyethylene",
    "plastic bag": "polyethylene",
    "plastic wrap": "polyethylene",
    "plastic bottle": "polyethylene",
    "bamboo toothbrush": "bamboo",
    "bamboo sheets": "bamboo",
    "bamboo cutting board": "bamboo",
    "bamboo utensils": "bamboo",
    "bamboo rayon dress": "bamboo rayon",
    "bamboo rayon shirt": "bamboo rayon",
    "bamboo rayon sheets": "bamboo rayon",
    "nylon rope": "nylon",
    "nylon jacket": "nylon",
    "nylon bag": "nylon",
    "microfiber blanket": "microfiber",
    "microfiber cloth": "microfiber",
    "microfiber towel": "microfiber",
    "crib sheet": "cotton",
    "cotton shirt": "cotton",
    "cotton towel": "cotton",
    "leggings": "nylon",
    "yoga pants": "nylon",
    "tote bag": "cotton",
    "canvas tote": "cotton",
    "kitchen utensils": "plastic",
    "dish brush": "plastic",
    "sponge": "polyester",
    "hemp rope": "hemp",
    "hemp shirt": "hemp",
    "linen shirt": "linen",
    "linen sheets": "linen",
    "wool sweater": "wool",
    "wool blanket": "wool",
    "wool socks": "wool",
    "silk shirt": "silk",
    "silk pillowcase": "silk",
    "cork mat": "cork",
    "cork coaster": "cork",
    "wooden spoon": "wood",
    "wooden cutting board": "wood",
    "glass bottle": "glass",
    "glass jar": "glass",
    "glass container": "glass",
    "ceramic mug": "ceramic",
    "ceramic plate": "ceramic",
    "ceramic bowl": "ceramic",
    "steel bottle": "steel",
    "stainless steel bottle": "steel",
    "steel straw": "steel",
    "silicone mat": "silicone",
    "silicone baking sheet": "silicone",
    "rubber gloves": "natural rubber",
    "rubber mat": "natural rubber",
    "viscose dress": "viscose",
    "viscose blouse": "viscose",
    "modal underwear": "modal",
    "modal shirt": "modal",
    "lyocell shirt": "lyocell",
    "tencel shirt": "lyocell",
    "acrylic sweater": "acrylic",
    "acrylic blanket": "acrylic",
    "pvc pipe": "pvc",
    "pvc flooring": "pvc",
    "vinyl flooring": "pvc",
    "organic cotton shirt": "organic cotton",
    "organic cotton sheets": "organic cotton",
    "polypropylene container": "polypropylene",
    "polypropylene bag": "polypropylene",
}


def find_material(query: str) -> Optional[dict]:
    """Match a product query to a material using rules."""
    q = query.strip().lower()

    # 1. Exact product mapping match
    if q in PRODUCT_MAPPINGS:
        mat_key = PRODUCT_MAPPINGS[q]
        return MATERIALS_DB.get(mat_key)

    # 2. Check if query contains a known material name (longest match first)
    sorted_keys = sorted(MATERIALS_DB.keys(), key=len, reverse=True)
    for mat_key in sorted_keys:
        if mat_key in q:
            return MATERIALS_DB[mat_key]

    # 3. Check product mappings for partial matches
    for product, mat_key in PRODUCT_MAPPINGS.items():
        # Check if any significant words from the product appear in query
        product_words = set(product.split())
        query_words = set(q.split())
        if len(product_words & query_words) >= 2:
            return MATERIALS_DB.get(mat_key)

    # 4. Single-word material check against individual query words
    for word in q.split():
        if word in MATERIALS_DB:
            return MATERIALS_DB[word]

    return None


# ─── Pydantic Models ────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query: str

class MaterialAlternative(BaseModel):
    name: str
    slug: str
    category: str

class SearchResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    query: str
    found: bool
    material_name: Optional[str] = None
    material_slug: Optional[str] = None
    category_key: Optional[str] = None
    category_label: Optional[str] = None
    risk_level: Optional[str] = None
    risk_color: Optional[str] = None
    explanation: Optional[str] = None
    alternatives: Optional[List[MaterialAlternative]] = None

class MaterialItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    slug: str
    category: str
    category_label: str
    risk_level: str
    risk_color: str
    description: str

class SearchAnalytic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    query: str
    found: bool
    material_matched: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ─── Routes ──────────────────────────────────────────────────────────────────

@api_router.get("/")
async def root():
    return {"message": "BioLens API"}

@api_router.post("/search", response_model=SearchResult)
async def search_product(req: SearchRequest):
    query = req.query.strip()
    material = find_material(query)

    # Track search in MongoDB
    analytic = SearchAnalytic(
        query=query,
        found=material is not None,
        material_matched=material["name"] if material else None,
    )
    doc = analytic.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.search_analytics.insert_one(doc)

    if not material:
        return SearchResult(query=query, found=False)

    cat = MATERIAL_CATEGORIES[material["category"]]

    alt_list = []
    for alt_name in material.get("alternatives", []):
        alt_mat = MATERIALS_DB.get(alt_name)
        if alt_mat:
            alt_cat = MATERIAL_CATEGORIES[alt_mat["category"]]
            alt_list.append(MaterialAlternative(
                name=alt_mat["name"],
                slug=alt_mat["slug"],
                category=alt_cat["label"],
            ))

    return SearchResult(
        query=query,
        found=True,
        material_name=material["name"],
        material_slug=material["slug"],
        category_key=material["category"],
        category_label=cat["label"],
        risk_level=cat["risk"],
        risk_color=cat["color"],
        explanation=material["explanation"],
        alternatives=alt_list,
    )

@api_router.get("/materials", response_model=List[MaterialItem])
async def get_materials():
    items = []
    for mat in MATERIALS_DB.values():
        cat = MATERIAL_CATEGORIES[mat["category"]]
        items.append(MaterialItem(
            name=mat["name"],
            slug=mat["slug"],
            category=mat["category"],
            category_label=cat["label"],
            risk_level=cat["risk"],
            risk_color=cat["color"],
            description=mat["description"],
        ))
    return items

@api_router.get("/materials/{slug}")
async def get_material(slug: str):
    for mat in MATERIALS_DB.values():
        if mat["slug"] == slug:
            cat = MATERIAL_CATEGORIES[mat["category"]]
            alt_list = []
            for alt_name in mat.get("alternatives", []):
                alt_mat = MATERIALS_DB.get(alt_name)
                if alt_mat:
                    alt_cat = MATERIAL_CATEGORIES[alt_mat["category"]]
                    alt_list.append({
                        "name": alt_mat["name"],
                        "slug": alt_mat["slug"],
                        "category": alt_cat["label"],
                        "description": alt_mat["description"],
                    })
            return {
                "name": mat["name"],
                "slug": mat["slug"],
                "category": mat["category"],
                "category_label": cat["label"],
                "risk_level": cat["risk"],
                "risk_color": cat["color"],
                "description": mat["description"],
                "explanation": mat["explanation"],
                "alternatives": alt_list,
            }
    return {"error": "Material not found"}

@api_router.get("/search/popular")
async def get_popular_searches():
    return {
        "examples": [
            "poly hoodie",
            "bamboo sheets",
            "pet bottle",
            "vegan leather bag",
            "plastic cutting board",
            "nylon rope",
            "wool sweater",
            "hemp shirt",
        ]
    }


# ─── Barcode Lookup (GS1-ready provider abstraction) ────────────────────────

BARCODE_PROVIDER = os.environ.get("BARCODE_PROVIDER", "upcitemdb")
GS1_API_KEY = os.environ.get("GS1_API_KEY", "")
GS1_BASE_URL = os.environ.get("GS1_BASE_URL", "https://api.gs1.org/v1")


class BarcodeRequest(BaseModel):
    barcode: str

class BarcodeResult(BaseModel):
    barcode: str
    title: Optional[str] = None
    brand: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None


# ─── Provider interface ──────────────────────────────────────────────────────

async def _lookup_upcitemdb(barcode: str) -> Optional[dict]:
    """UPCitemdb provider (broad consumer product coverage)."""
    try:
        async with httpx.AsyncClient(timeout=8.0) as c:
            resp = await c.get(
                "https://api.upcitemdb.com/prod/trial/lookup",
                params={"upc": barcode},
            )
            if resp.status_code == 200:
                items = resp.json().get("items", [])
                if items:
                    item = items[0]
                    return {
                        "title": item.get("title", ""),
                        "brand": item.get("brand", ""),
                        "description": item.get("description", ""),
                        "source": "upcitemdb",
                    }
    except Exception as e:
        logger.warning(f"UPCitemdb lookup failed: {e}")
    return None


async def _lookup_openfoodfacts(barcode: str) -> Optional[dict]:
    """Open Food Facts provider (food/beverage products)."""
    try:
        async with httpx.AsyncClient(timeout=8.0) as c:
            resp = await c.get(
                f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json",
                headers={"User-Agent": "BioLens/1.0"},
            )
            if resp.status_code == 200:
                product = resp.json().get("product", {})
                name = product.get("product_name", "")
                if name:
                    return {
                        "title": name,
                        "brand": product.get("brands", ""),
                        "description": product.get("generic_name", ""),
                        "source": "openfoodfacts",
                    }
    except Exception as e:
        logger.warning(f"Open Food Facts lookup failed: {e}")
    return None


async def _lookup_gs1(barcode: str) -> Optional[dict]:
    """GS1 API provider (production-grade, requires API key)."""
    if not GS1_API_KEY:
        logger.info("GS1 API key not configured, skipping")
        return None
    try:
        async with httpx.AsyncClient(timeout=10.0) as c:
            resp = await c.get(
                f"{GS1_BASE_URL}/products/{barcode}",
                headers={
                    "Authorization": f"Bearer {GS1_API_KEY}",
                    "Accept": "application/json",
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "title": data.get("productName", data.get("title", "")),
                    "brand": data.get("brandName", data.get("brand", "")),
                    "description": data.get("productDescription", ""),
                    "source": "gs1",
                }
    except Exception as e:
        logger.warning(f"GS1 lookup failed: {e}")
    return None


# Provider registry — order matters for fallback chain
BARCODE_PROVIDERS = {
    "gs1": [_lookup_gs1, _lookup_upcitemdb, _lookup_openfoodfacts],
    "upcitemdb": [_lookup_upcitemdb, _lookup_openfoodfacts],
    "openfoodfacts": [_lookup_openfoodfacts, _lookup_upcitemdb],
}


@api_router.post("/barcode/lookup", response_model=BarcodeResult)
async def barcode_lookup(req: BarcodeRequest):
    """
    Barcode identity lookup with full cascade:
    1. product_barcodes (Supabase)
    2. product_barcode_cache (Supabase)
    3. External provider cascade (UPCitemdb, Open Food Facts, GS1)
    4. Cache result back to Supabase product_barcode_cache
    """
    barcode = req.barcode.strip()
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"} if SUPABASE_URL and SUPABASE_KEY else {}

    # Step 1: Check product_barcodes in Supabase
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            async with httpx.AsyncClient(timeout=6.0) as c:
            resp = await c.get(
    f"{SUPABASE_URL}/rest/v1/product_barcode_cache",
    params={
        "gtin": f"eq.{barcode}",
        "select": "product_title,brand_name,category_name,description,data_source"
    },
    headers={**headers, "Accept": "application/json"},
)
                if resp.status_code == 200:
                    rows = resp.json()
                    if rows and len(rows) > 0:
                        row = rows[0]
                        logger.info(f"Barcode {barcode} found in product_barcodes")
                        return BarcodeResult(
                            barcode=barcode,
                            title=row.get("product_title", ""),
                            brand=row.get("brand_name", ""),
                            description=row.get("description", ""),
                            source="product_barcodes",
                        )
        except Exception as e:
            logger.warning(f"product_barcodes lookup failed: {e}")

    # Step 2: Check product_barcode_cache in Supabase
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            async with httpx.AsyncClient(timeout=6.0) as c:
                resp = await c.get(
                    f"{SUPABASE_URL}/rest/v1/product_barcode_cache",
                    params={"barcode": f"eq.{barcode}", "select": "title,brand,description,source"},
                    headers={**headers, "Accept": "application/json"},
                )
                if resp.status_code == 200:
                    rows = resp.json()
                    if rows and len(rows) > 0:
                        row = rows[0]
                        logger.info(f"Barcode {barcode} found in product_barcode_cache")
                        return BarcodeResult(
                            barcode=barcode,
                            title=row.get("title", ""),
                            brand=row.get("brand", ""),
                            description=row.get("description", ""),
                            source=f"cache:{row.get('source', '')}",
                        )
        except Exception as e:
            logger.warning(f"product_barcode_cache lookup failed: {e}")

    # Step 3: External provider cascade
    providers = BARCODE_PROVIDERS.get(BARCODE_PROVIDER, BARCODE_PROVIDERS["upcitemdb"])
    for provider_fn in providers:
        result = await provider_fn(barcode)
        if result and result.get("title"):
            # Step 4: Cache result to Supabase product_barcode_cache
            if SUPABASE_URL and SUPABASE_KEY:
                try:
                    async with httpx.AsyncClient(timeout=6.0) as c:
                        await c.post(
                            f"{SUPABASE_URL}/rest/v1/product_barcode_cache",
                            json={
                                "barcode": barcode,
                                "title": result["title"],
                                "brand": result.get("brand", ""),
                                "description": result.get("description", ""),
                                "source": result["source"],
                            },
                            headers={**headers, "Content-Type": "application/json", "Prefer": "return=minimal"},
                        )
                        logger.info(f"Cached barcode {barcode} to product_barcode_cache")
                except Exception as e:
                    logger.warning(f"Failed to cache barcode: {e}")

            # Also store in MongoDB for local analytics
            await db.barcode_lookups.insert_one({
                "id": str(uuid.uuid4()),
                "barcode": barcode,
                "title": result["title"],
                "brand": result.get("brand", ""),
                "description": result.get("description", ""),
                "source": result["source"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            return BarcodeResult(barcode=barcode, **result)

    return BarcodeResult(barcode=barcode)


# ─── App Setup ───────────────────────────────────────────────────────────────

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
