#!/usr/bin/env python3
"""
Generate a comprehensive Indian artisan & retail pricing dataset.
Combines:
  1. Handloom & Textiles (Sarees, Shawls, Dupattas, Kurtas)
  2. Pottery, Terracotta & Ceramics
  3. Woodwork & Wooden Carvings
  4. Metalcraft & Brass Idols
  5. Jewelry & Kundan Craft
  6. Hand Embroidery & Soft Toys
  7. Tech/Electronics Accessories (Chargers, Cables, Adapters, Gadgets)
  8. Real platform listings from products.json
"""

import json
import random
from pathlib import Path
import pandas as pd

random.seed(42)

CATEGORIES = {
    "Handloom Textile": {
        "titles": [
            "Handloom Pure Silk Banarasi Saree with Zari Border",
            "Handwoven Cotton Chanderi Dupatta with Booti Work",
            "Authentic Kanjivaram Silk Festive Saree",
            "Khadi Cotton Handloom Kurta for Men",
            "Pochampally Ikat Handwoven Saree",
            "Organic Handloom Linen Scarf with Tassels",
            "Handwoven Woolen Kashmiri Pashmina Shawl",
            "Traditional Jamdani Cotton Saree",
            "Handspun Cotton Table Runner with Tribal Motifs",
            "Handloom Sambalpuri Silk Traditional Saree"
        ],
        "material_range": (300, 3500),
        "labor_multiplier": (1.8, 3.2),
        "base_price_range": (600, 9500)
    },
    "Pottery & Clay": {
        "titles": [
            "Handcrafted Terracotta Water Pitcher with Traditional Lid",
            "Handmade Clay Coffee Mugs Set of 2",
            "Artisan Glazed Ceramic Dining Soup Bowls Set of 4",
            "Traditional Handpainted Clay Diya Festive Set",
            "Handmade Terracotta Decorative Wall Hanging",
            "Earthen Clay Cooking Handi Pot",
            "Artisan Ceramic Planter with Drainage Plate",
            "Handmade Clay Kulhad Chai Cups Set of 6",
            "Sculpted Clay Floral Vase with Rustic Finish"
        ],
        "material_range": (50, 400),
        "labor_multiplier": (1.6, 2.5),
        "base_price_range": (250, 1800)
    },
    "Woodwork": {
        "titles": [
            "Carved Sheesham Wood Elephant Figurine",
            "Handmade Teak Wood Kitchen Spatula & Spoon Set",
            "Intricately Carved Wooden Jewellery Box with Brass Inlay",
            "Handcrafted Walnut Wood Decorative Serving Tray",
            "Artisan Hand-Carved Wooden Wall Panel Relief",
            "Handmade Wooden Coaster Set of 6 with Stand",
            "Sandalwood Carved Incense Stick Holder",
            "Handmade Mango Wood Candle Stand Pair"
        ],
        "material_range": (150, 1200),
        "labor_multiplier": (2.0, 3.5),
        "base_price_range": (450, 4200)
    },
    "Metalwork": {
        "titles": [
            "Dhokra Brass Hand-Cast Tribal Figurine",
            "Antique Finish Pure Copper Water Bottle (1 Litre)",
            "Handmade Brass Pooja Bell with Peacock Handle",
            "Hand-Beaten Brass Dining Platter Thali Set",
            "Cast Iron Artisan Skillet Fry Pan",
            "Pure Bronze Kansa Serving Bowls Set of 2",
            "Handmade Brass Diya Oil Lamp Hanging"
        ],
        "material_range": (250, 1800),
        "labor_multiplier": (1.8, 3.0),
        "base_price_range": (700, 5500)
    },
    "Jewelry": {
        "titles": [
            "Handcrafted Oxidised 925 Silver Tribal Choker Necklace",
            "Handmade Kundan & Pearl Jhumka Earrings",
            "Artisan Filigree Pure Silver Toe Rings Pair",
            "Handmade Brass Meenakari Enamel Bangles Set",
            "Terracotta Handpainted Statement Jewelry Set",
            "Handcrafted Beaded Semi-Precious Stone Bracelet",
            "Traditional Temple Jewelry Gold Plated Pendant"
        ],
        "material_range": (200, 2500),
        "labor_multiplier": (2.0, 4.0),
        "base_price_range": (500, 8500)
    },
    "Embroidery": {
        "titles": [
            "Hand-Embroidered Chikankari Cotton Kurti",
            "Handmade Soft Stuffed Bunny Toy Holding a Carrot",
            "Kantha Stitch Embroidered Cotton Cushion Covers Pair",
            "Zardozi Work Hand-Embroidered Velvet Clutch Bag",
            "Phulkari Hand-Embroidered Traditional Dupatta",
            "Handmade Crocheted Cotton Baby Blanket",
            "Mirror Work Kutch Embroidered Wall Tapestry",
            "Hand-Stitched Patchwork Quilt Throw Blanket"
        ],
        "material_range": (150, 1000),
        "labor_multiplier": (1.8, 3.2),
        "base_price_range": (450, 3800)
    },
    "Electronics": {
        "titles": [
            "Premium 60W Fast Charging Laptop Charger Power Adapter",
            "65W GaN USB-C Fast Charger with Foldable Plug",
            "100W Type-C Heavy Duty Braided Charging Cable 2m",
            "Ergonomic Wireless Silent Optical Mouse",
            "10000mAh Magnetic Wireless Power Bank Fast Charge",
            "7-in-1 Aluminium USB-C Multiport Hub Adapter",
            "Handcrafted Bamboo Wood Bluetooth Wireless Speaker",
            "Noise Cancelling Over-Ear Studio Headphones",
            "45W Type-C Fast Charger for Ultrasharp Laptops",
            "USB-C to Lightning Braided Fast Sync Cable"
        ],
        "material_range": (250, 1500),
        "labor_multiplier": (1.4, 2.5),
        "base_price_range": (550, 3500)
    }
}

ADJECTIVES = [
    "Premium", "Handcrafted", "Traditional", "Authentic", "Vintage", "Custom", 
    "Artisan", "Eco-Friendly", "Deluxe", "Classic", "Handmade", "Exquisite"
]

def generate_synthetic_data(num_samples_per_category=700):
    rows = []
    
    for craft, config in CATEGORIES.items():
        titles = config["titles"]
        mat_min, mat_max = config["material_range"]
        mult_min, mult_max = config["labor_multiplier"]
        price_min, price_max = config["base_price_range"]
        
        for _ in range(num_samples_per_category):
            base_title = random.choice(titles)
            adj = random.choice(ADJECTIVES)
            
            # Title variation
            if not base_title.startswith(adj):
                if random.random() < 0.4:
                    full_title = f"{adj} {base_title}"
                else:
                    full_title = base_title
            else:
                full_title = base_title
                
            mat_cost = round(random.uniform(mat_min, mat_max), -1)
            multiplier = random.uniform(mult_min, mult_max)
            calculated_price = mat_cost * multiplier + random.uniform(100, 400)
            
            # Clamp to range and round to multiple of 50
            final_price = max(price_min, min(price_max, calculated_price))
            final_price = int(round(final_price / 50.0) * 50)
            
            competitor_price = int(round((final_price * random.uniform(1.1, 1.35)) / 50.0) * 50)
            cost_floor = int(round((mat_cost * 1.4 + 100) / 50.0) * 50)

            rows.append({
                "product_title": full_title,
                "craft_type": craft,
                "material_cost": mat_cost,
                "price": final_price,
                "median_competitor_price": competitor_price,
                "cost_floor": cost_floor,
                "source": "synthetic_benchmark"
            })
            
    # Include actual products from backend/data/products.json if available
    products_file = Path(__file__).resolve().parent / "data" / "products.json"
    if products_file.exists():
        try:
            with open(products_file, "r", encoding="utf-8") as f:
                prods = json.load(f)
                for p in prods:
                    try:
                        raw_price = str(p.get("price", "0")).replace("₹", "").replace(",", "").strip()
                        price_val = float(raw_price)
                        if price_val > 0:
                            rows.append({
                                "product_title": p.get("title", ""),
                                "craft_type": p.get("craft_type", p.get("category", "Handicraft")),
                                "material_cost": float(p.get("material_cost", 0) or 0),
                                "price": int(round(price_val / 50.0) * 50),
                                "median_competitor_price": int(round(price_val * 1.2 / 50.0) * 50),
                                "cost_floor": int(round(price_val * 0.75 / 50.0) * 50),
                                "source": "platform_database"
                            })
                    except Exception:
                        pass
        except Exception as e:
            print(f"Note: Could not read platform products.json: {e}")

    df = pd.DataFrame(rows)
    # Shuffle
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    return df

if __name__ == "__main__":
    out_dir = Path(__file__).resolve().parent / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "artisan_pricing_dataset.csv"
    
    print(f"Generating Indian artisan pricing dataset...")
    df = generate_synthetic_data(num_samples_per_category=800)
    df.to_csv(out_path, index=False)
    print(f"Saved {len(df)} curated product pricing rows to: {out_path}")
    print("\nDataset Breakdown:")
    print(df["craft_type"].value_counts())
    print("\nSample rows:")
    print(df[["product_title", "craft_type", "material_cost", "price"]].head(8))
