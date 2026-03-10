# OMRI_OPERATING_PLAYBOOK.md
**Operational Decision Logic for AtlasPM**

This document captures the real-world operational decision logic used by Omri Kedem for property management. AtlasPM should use these rules to guide automation, suggestions, inspections, work orders, and owner reporting.

The goal is for AtlasPM to behave like a skilled property manager rather than a passive database.

---

## 1. Vacancy Management Logic

Vacancy should ideally be known **before the tenant moves out**.

### Vacancy lifecycle

Tenant gives notice  
→ Unit marked **Upcoming Vacancy**

Move-out day  
→ Unit status becomes **Vacant**

Same day actions:
- inspect unit
- determine scope of work
- create turnover work order
- prepare unit for listing

### Turnover expectations

If no major work required:

**Turnover target: 1–2 days**

If major repairs are required:
- create scope
- assign vendor
- update owner if timeline exceeds standard turnover window

### Vacancy monitoring

AtlasPM should track:
- days vacant
- broker assignment
- showings
- listing date

Owner alerts should occur when vacancy extends beyond expected turnover window.

---

## 2. Collections Escalation Logic

Collections follow an escalation timeline.

### 0–10 days late
Action:
- send reminder
- monitor payment

### 10–30 days late
Action:
- aggressive collection
- phone calls
- door knock if necessary
- attempt payment plan

### 30–60 days late
Action:
- initiate legal process according to NYC law

Typical steps include:
- rent demand notice
- statutory waiting periods (5-day / 14-day etc.)
- legal filing

AtlasPM should suggest **legal review** once tenant passes the 30-day threshold without resolution.

---

## 3. Violation Priority Logic

Violations must be addressed quickly to prevent escalation.

Priority order:

### Priority 1 – Heat and Hot Water
These must be addressed immediately.

### Priority 2 – Class C violations
Hazardous conditions requiring prompt repair.

### Priority 3 – Tenant complaints
Complaints should be addressed early to prevent them from becoming formal violations.

### Priority 4 – Class B violations
Important but not immediately dangerous.

### Priority 5 – Class A violations
Least urgent but still must be resolved.

AtlasPM should attempt to resolve issues **before they turn into violations** whenever possible.

---

## 4. Work Order Assignment Logic

Decision between super vs contractor depends on:
- skill level required
- estimated repair time
- complexity of repair

### General guideline

**1–3 hours work → building superintendent**  
**More complex or longer work → contractor**

This rule is flexible and depends on the nature of the repair.

AtlasPM should suggest likely assignment but allow manual override.

---

## 5. Move-Out Damage Charges

Move-out inspections should evaluate damages and apply preset charges where appropriate.

Charges may be calculated automatically based on a damage checklist.

### Key charges

- Failure to turn in keys — **$150 per lock**
- Failure to turn in mailbox key — **$25 per lock**
- Missing keys — **$15 per duplicate**
- Garbage disposal replacement — **$150**
- Dishwasher panel damage — **$100–$200**
- Refrigerator shelf damage — **$100**
- Missing refrigerator drawers — **$50–$150**
- Dented oven door — **$175–$400**
- Damaged refrigerator door — **$10–$400**
- Kitchen counter damage — **$100–$700**
- Dirty stove or oven — **$15–$50**
- Dirty refrigerator/freezer — **$15–$50**
- Missing ice trays — **$10**
- Kitchen floor damage — **up to $600**
- Dirty kitchen floor — **$25–$50**
- Missing disposal stopper — **$10**
- Grease or dirt on cabinets — **$15–$100**
- Missing light lens — **$25–$50**
- Interior door damage — **$50–$200**
- Missing door knobs — **$75**
- Contact paper removal — **$25 per shelf**
- Dirty range hood/filter — **$25**
- Ceiling fan replacement — **$250**
- Light fixture replacement — **$50–$200**
- Trash removal — **$50 per room**
- Furniture removal — **$50 per piece**
- Broken windows — **varies**
- Vanity damage — **$100–$700**
- Wallpaper removal — **varies**
- Unauthorized paint colors — **varies**
- Dirty bathroom — **$25–$75**
- Tub damage or cleaning — **$30–$300**
- Tile cleaning — **$30–$75**
- Stain sealing due to negligence — **varies**
- Excessive nail holes — **$5–$40**
- Large wall holes — **varies**
- Carpet damage — **varies**
- Flooring damage — **varies**
- Missing blinds — **$40–$300**

**Labor reference rate:** $28/hour

AtlasPM should calculate total recommended charges and suggest deposit return amounts.

Property manager must review before sending to tenant.

---

## 6. Owner Communication Priorities

Owners generally care about the following issues:

### 1. Legal cases
Status of eviction or legal proceedings.

### 2. Violations
Especially when they affect:
- insurance
- financing
- bank relationships

### 3. Major repairs
Owners usually only want updates for significant expenses.

Routine maintenance typically does not require owner involvement.

---

## AtlasPM Decision Philosophy

AtlasPM should prioritize:
- revenue protection (vacancy + arrears)
- compliance (violations)
- legal escalation
- building condition
- operational transparency

The system should surface problems early and summarize them clearly for both property managers and owners.

---

## Next Step

AtlasPM can use this playbook for:
- rule-based suggestions
- inspection checklists
- legal escalation alerts
- vacancy alerts
- move-out charge automation
- owner reporting summaries

This becomes the **thinking layer** of AtlasPM.
