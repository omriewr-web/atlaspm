// ============================================================================
// AtlasPM Building Upload Specification
// Single-file flat format for NYC multifamily building data
// ============================================================================

import { z } from "zod";

// ─── 3. JSON Schema (Zod) for Upload Validation ────────────────────────────

const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"] as const;

const BUILDING_CLASSES = [
  // Residential
  "A0","A1","A2","A3","A4","A5","A6","A7","A8","A9",
  "B1","B2","B3","B9",
  "C0","C1","C2","C3","C4","C5","C6","C7","C8","C9",
  "D0","D1","D2","D3","D4","D5","D6","D7","D8","D9",
  // Condo/Coop
  "R0","R1","R2","R3","R4","R5","R6","R7","R8","R9",
  "RR",
] as const;

const CONSTRUCTION_TYPES = [
  "fireproof",
  "non-fireproof",
  "fire-resistive",
  "heavy-timber",
  "wood-frame",
  "other",
] as const;

const BOILER_TYPES = ["gas", "oil", "dual-fuel", "electric", "steam", "none"] as const;
const HOT_WATER_TYPES = ["gas", "oil", "electric", "solar", "steam", "none"] as const;
const GAS_TYPES = ["natural", "propane", "none"] as const;
const LANDMARK_STATUSES = ["none", "individual", "historic-district", "interior", "scenic"] as const;
const AEP_STATUSES = ["none", "enrolled", "discharged"] as const;
const BUILDING_STATUSES = ["active", "inactive", "under-renovation", "pre-development"] as const;

export const buildingUploadSchema = z.object({
  // ── Identity ──
  building_id: z.string().min(1).max(50),
  building_name: z.string().max(200).optional(),

  // ── Location ──
  address: z.string().min(5).max(200),
  city: z.string().max(50).default("New York"),
  state: z.string().length(2).default("NY"),
  zip: z.string().regex(/^\d{5}$/, "Must be 5-digit zip code"),
  borough: z.enum(BOROUGHS),
  block: z.string().regex(/^\d{1,5}$/, "Block must be 1-5 digits").optional(),
  lot: z.string().regex(/^\d{1,4}$/, "Lot must be 1-4 digits").optional(),
  bbl: z.string().regex(/^\d{10}$/, "BBL must be exactly 10 digits").optional(),
  bin: z.string().regex(/^\d{7}$/, "BIN must be exactly 7 digits").optional(),
  hpd_registration_id: z.string().max(20).optional(),
  certificate_of_occupancy: z.string().max(20).optional(),
  portfolio: z.string().max(100).optional(),

  // ── Structure ──
  year_built: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  floors: z.number().int().min(1).max(120).optional(),
  units: z.number().int().min(0).max(2000),
  commercial_units: z.number().int().min(0).max(500).default(0),
  total_square_footage: z.number().int().min(0).optional(),
  building_class: z.enum(BUILDING_CLASSES).optional(),
  construction_type: z.enum(CONSTRUCTION_TYPES).optional(),
  rent_stabilized: z.boolean().default(false),
  landmark_status: z.enum(LANDMARK_STATUSES).default("none"),
  aep_status: z.enum(AEP_STATUSES).default("none"),
  building_status: z.enum(BUILDING_STATUSES).default("active"),

  // ── Systems ──
  boiler_type: z.enum(BOILER_TYPES).optional(),
  boiler_install_year: z.number().int().min(1950).max(new Date().getFullYear()).optional(),
  hot_water_type: z.enum(HOT_WATER_TYPES).optional(),
  gas_type: z.enum(GAS_TYPES).optional(),
  elevator: z.boolean().default(false),
  elevator_count: z.number().int().min(0).max(20).default(0),
  sprinkler_system: z.boolean().default(false),
  fire_alarm_system: z.boolean().default(false),
  oil_tank: z.boolean().default(false),

  // ── People ──
  owner_name: z.string().max(200).optional(),
  management_company: z.string().max(200).optional(),
  property_manager: z.string().max(200).optional(),
  superintendent: z.string().max(200).optional(),

  // ── Meta ──
  last_inspection_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
    .optional(),
  notes: z.string().max(2000).optional(),
});

export type BuildingUploadRow = z.infer<typeof buildingUploadSchema>;


// ─── 4. TypeScript Interface ────────────────────────────────────────────────

export interface BuildingRecord {
  // Identity
  building_id: string;
  building_name?: string;

  // Location
  address: string;
  city: string;
  state: string;
  zip: string;
  borough: "Manhattan" | "Brooklyn" | "Queens" | "Bronx" | "Staten Island";
  block?: string;
  lot?: string;
  bbl?: string;
  bin?: string;
  hpd_registration_id?: string;
  certificate_of_occupancy?: string;
  portfolio?: string;

  // Structure
  year_built?: number;
  floors?: number;
  units: number;
  commercial_units: number;
  total_square_footage?: number;
  building_class?: string;
  construction_type?: string;
  rent_stabilized: boolean;
  landmark_status: "none" | "individual" | "historic-district" | "interior" | "scenic";
  aep_status: "none" | "enrolled" | "discharged";
  building_status: "active" | "inactive" | "under-renovation" | "pre-development";

  // Systems
  boiler_type?: "gas" | "oil" | "dual-fuel" | "electric" | "steam" | "none";
  boiler_install_year?: number;
  hot_water_type?: "gas" | "oil" | "electric" | "solar" | "steam" | "none";
  gas_type?: "natural" | "propane" | "none";
  elevator: boolean;
  elevator_count: number;
  sprinkler_system: boolean;
  fire_alarm_system: boolean;
  oil_tank: boolean;

  // People
  owner_name?: string;
  management_company?: string;
  property_manager?: string;
  superintendent?: string;

  // Meta
  last_inspection_date?: string; // YYYY-MM-DD
  notes?: string;
}


// ─── 5. SQL CREATE TABLE (PostgreSQL) ───────────────────────────────────────

export const CREATE_TABLE_SQL = `
CREATE TABLE buildings (
  -- Identity
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id             VARCHAR(50) NOT NULL UNIQUE,
  building_name           VARCHAR(200),

  -- Location
  address                 VARCHAR(200) NOT NULL,
  city                    VARCHAR(50) NOT NULL DEFAULT 'New York',
  state                   CHAR(2) NOT NULL DEFAULT 'NY',
  zip                     CHAR(5) NOT NULL,
  borough                 VARCHAR(15) NOT NULL
                            CHECK (borough IN ('Manhattan','Brooklyn','Queens','Bronx','Staten Island')),
  block                   VARCHAR(5),
  lot                     VARCHAR(4),
  bbl                     CHAR(10),
  bin                     CHAR(7),
  hpd_registration_id     VARCHAR(20),
  certificate_of_occupancy VARCHAR(20),
  portfolio               VARCHAR(100),

  -- Structure
  year_built              SMALLINT CHECK (year_built BETWEEN 1800 AND EXTRACT(YEAR FROM NOW())),
  floors                  SMALLINT CHECK (floors BETWEEN 1 AND 120),
  units                   SMALLINT NOT NULL CHECK (units >= 0),
  commercial_units        SMALLINT NOT NULL DEFAULT 0 CHECK (commercial_units >= 0),
  total_square_footage    INTEGER CHECK (total_square_footage >= 0),
  building_class          VARCHAR(4),
  construction_type       VARCHAR(20)
                            CHECK (construction_type IN ('fireproof','non-fireproof','fire-resistive','heavy-timber','wood-frame','other')),
  rent_stabilized         BOOLEAN NOT NULL DEFAULT FALSE,
  landmark_status         VARCHAR(20) NOT NULL DEFAULT 'none'
                            CHECK (landmark_status IN ('none','individual','historic-district','interior','scenic')),
  aep_status              VARCHAR(15) NOT NULL DEFAULT 'none'
                            CHECK (aep_status IN ('none','enrolled','discharged')),
  building_status         VARCHAR(20) NOT NULL DEFAULT 'active'
                            CHECK (building_status IN ('active','inactive','under-renovation','pre-development')),

  -- Systems
  boiler_type             VARCHAR(15)
                            CHECK (boiler_type IN ('gas','oil','dual-fuel','electric','steam','none')),
  boiler_install_year     SMALLINT CHECK (boiler_install_year BETWEEN 1950 AND EXTRACT(YEAR FROM NOW())),
  hot_water_type          VARCHAR(10)
                            CHECK (hot_water_type IN ('gas','oil','electric','solar','steam','none')),
  gas_type                VARCHAR(10)
                            CHECK (gas_type IN ('natural','propane','none')),
  elevator                BOOLEAN NOT NULL DEFAULT FALSE,
  elevator_count          SMALLINT NOT NULL DEFAULT 0 CHECK (elevator_count >= 0),
  sprinkler_system        BOOLEAN NOT NULL DEFAULT FALSE,
  fire_alarm_system       BOOLEAN NOT NULL DEFAULT FALSE,
  oil_tank                BOOLEAN NOT NULL DEFAULT FALSE,

  -- People
  owner_name              VARCHAR(200),
  management_company      VARCHAR(200),
  property_manager        VARCHAR(200),
  superintendent          VARCHAR(200),

  -- Meta
  last_inspection_date    DATE,
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Unique Constraints ──
CREATE UNIQUE INDEX idx_buildings_bbl ON buildings (bbl) WHERE bbl IS NOT NULL;
CREATE UNIQUE INDEX idx_buildings_bin ON buildings (bin) WHERE bin IS NOT NULL;

-- ── Indexes for Lookups & Filtering ──
CREATE INDEX idx_buildings_borough ON buildings (borough);
CREATE INDEX idx_buildings_zip ON buildings (zip);
CREATE INDEX idx_buildings_portfolio ON buildings (portfolio) WHERE portfolio IS NOT NULL;
CREATE INDEX idx_buildings_block_lot ON buildings (block, lot) WHERE block IS NOT NULL AND lot IS NOT NULL;
CREATE INDEX idx_buildings_building_status ON buildings (building_status);
CREATE INDEX idx_buildings_aep_status ON buildings (aep_status) WHERE aep_status != 'none';
CREATE INDEX idx_buildings_rent_stabilized ON buildings (rent_stabilized) WHERE rent_stabilized = TRUE;
CREATE INDEX idx_buildings_address ON buildings USING gin (address gin_trgm_ops);
CREATE INDEX idx_buildings_owner ON buildings USING gin (owner_name gin_trgm_ops) WHERE owner_name IS NOT NULL;
`;


// ─── 6. Validation Rules ───────────────────────────────────────────────────

export const VALIDATION_RULES = {
  required_fields: [
    "building_id",  // Internal unique key, must be provided or auto-generated
    "address",      // Street address is the minimum identifier
    "zip",          // Needed for borough inference and mail
    "borough",      // Core NYC geography, drives BBL construction
    "units",        // Residential unit count, fundamental metric
  ],

  unique_fields: [
    "building_id",  // Primary business key — must be unique across all uploads
    "bbl",          // Borough-block-lot is unique per tax lot in NYC (when provided)
    "bin",          // DOB BIN is unique per building (when provided)
  ],

  field_formats: {
    building_id:          "Alphanumeric + hyphens, 1-50 chars (e.g. BLD-001, ATLAS-0045)",
    address:              "NYC street address, 5-200 chars (e.g. '450 West 145th Street')",
    zip:                  "Exactly 5 digits (e.g. '10031')",
    borough:              "One of: Manhattan, Brooklyn, Queens, Bronx, Staten Island",
    block:                "1-5 digits, leading zeros stripped on import (e.g. '02081' → '2081')",
    lot:                  "1-4 digits, leading zeros stripped on import (e.g. '0045' → '45')",
    bbl:                  "Exactly 10 digits: borough(1) + block(5) + lot(4) (e.g. '1020810045')",
    bin:                  "Exactly 7 digits (DOB Building Identification Number)",
    year_built:           "4-digit year, 1800–current year",
    boiler_install_year:  "4-digit year, 1950–current year",
    last_inspection_date: "ISO date: YYYY-MM-DD",
    rent_stabilized:      "Boolean: true/false, yes/no, 1/0",
    elevator:             "Boolean: true/false, yes/no, 1/0",
    sprinkler_system:     "Boolean: true/false, yes/no, 1/0",
    fire_alarm_system:    "Boolean: true/false, yes/no, 1/0",
    oil_tank:             "Boolean: true/false, yes/no, 1/0",
  },

  allowed_values: {
    borough:           ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"],
    building_class:    "DOF class code (A0-A9, B1-B3/B9, C0-C9, D0-D9, R0-R9, RR)",
    construction_type: ["fireproof", "non-fireproof", "fire-resistive", "heavy-timber", "wood-frame", "other"],
    boiler_type:       ["gas", "oil", "dual-fuel", "electric", "steam", "none"],
    hot_water_type:    ["gas", "oil", "electric", "solar", "steam", "none"],
    gas_type:          ["natural", "propane", "none"],
    landmark_status:   ["none", "individual", "historic-district", "interior", "scenic"],
    aep_status:        ["none", "enrolled", "discharged"],
    building_status:   ["active", "inactive", "under-renovation", "pre-development"],
  },

  computed_on_import: {
    bbl: "If borough + block + lot are all provided, compute bbl = borough_code(1) + zero_pad(block,5) + zero_pad(lot,4). Borough codes: Manhattan=1, Bronx=2, Brooklyn=3, Queens=4, Staten Island=5.",
  },

  cross_field_rules: [
    "If elevator is false, elevator_count must be 0",
    "If boiler_type is 'none', boiler_install_year should be empty",
    "If block and lot are provided, borough is required (to construct BBL)",
    "If oil_tank is true, boiler_type should be 'oil' or 'dual-fuel' (warning, not error)",
    "If aep_status is 'enrolled', building_status should be 'active'",
  ],

  recommended_indexes: [
    "bbl          — Primary NYC lookup key (unique, partial — WHERE bbl IS NOT NULL)",
    "bin          — DOB lookup key (unique, partial)",
    "borough      — Filter by borough",
    "zip          — Geographic filtering and grouping",
    "portfolio    — Portfolio-level dashboards and reporting",
    "block + lot  — Tax lot lookups (composite, partial)",
    "building_status — Active/inactive filtering",
    "aep_status   — HPD AEP program tracking (partial — WHERE != 'none')",
    "rent_stabilized — Stabilized building filtering (partial — WHERE = TRUE)",
    "address      — Trigram index for fuzzy address search",
    "owner_name   — Trigram index for owner name search",
  ],
};
