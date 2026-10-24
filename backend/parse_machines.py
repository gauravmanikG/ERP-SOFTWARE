# Regenerates backend/src/main/resources/machine_master.sql and the frontend machinesData.json.
# The table is defined in schema.sql. The generated SQL refuses to run if machine_master already has rows.
import csv
import json
import re

csv_path = r"c:\Users\gaura\Downloads\silver-muller-seals\backend\src\main\resources\machines_raw.csv"
sql_path = r"c:\Users\gaura\Downloads\silver-muller-seals\backend\src\main\resources\machine_master.sql"
json_path = r"c:\Users\gaura\Downloads\silver-muller-seals\frontend\src\modules\maintenance\data\machinesData.json"

machines = []

with open(csv_path, mode="r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    idx = 1
    for row in reader:
        s_no = int(row["s.no"]) if row.get("s.no") and row["s.no"].strip().isdigit() else idx
        dept = (row.get("Dept") or "").strip()
        mc_no = (row.get("M/C.no") or "").strip()
        # Convert "m/c-1" to "M/C -1"
        mc_no = re.sub(r'(?i)m/c\s*-?\s*(\d+)', r'M/C -\1', mc_no)
        desc = (row.get("Description of machine") or "").strip().replace("\n", " ").replace("\r", " ")
        desc = re.sub(r"\s+", " ", desc)
        
        loc = (row.get("Location") or "").strip().replace("\n", " ").replace("\r", " ")
        loc = re.sub(r"\s+", " ", loc)
        
        spec = (row.get("Specification") or "").strip().replace("\r\n", "\n").replace("\r", "\n")
        spec = re.sub(r"[ \t]+", " ", spec).strip()
        
        capacity = (row.get("Capacity") or "").strip().replace("\n", " ").replace("\r", " ")
        capacity = re.sub(r"\s+", " ", capacity)
        
        make = (row.get("Make") or "").strip().replace("\n", " ").replace("\r", " ")
        make = re.sub(r"\s+", " ", make)
        
        remarks = (row.get("Remarks") or "").strip()
        
        # Inferred Dept if empty
        if not dept:
            if "GATE" in loc.upper():
                dept = "Gate / Utility"
            elif "STORE" in loc.upper():
                dept = "Store / Utility"
            else:
                dept = "Utility / Plant"
                
        # Category classification
        category = "Process"
        dept_u = dept.upper()
        desc_u = desc.upper()
        if "GENERATR" in desc_u or "COMPRESSOR" in desc_u or "TRANSFORMER" in desc_u or "UTILITY" in dept_u:
            category = "Utility / Power"
        elif "SAND" in dept_u or "BLAST" in desc_u:
            category = "Surface Treatment"
        elif "RUBBER" in dept_u or "COMPOUND" in dept_u or "KNEADER" in desc_u:
            category = "Rubber Compounding"
        elif "T/ROOM" in dept_u or "TOOL ROOM" in loc.upper() or "LATHE" in desc_u or "GRINDER" in desc_u or "DRILLING" in desc_u or "CNC" in desc_u:
            category = "Tool Room & Machining"
        elif "MOULDING" in dept_u or "MOULDING" in loc.upper():
            category = "Moulding Press"
        elif "FINISHING" in dept_u or "FINISHING" in loc.upper():
            category = "Finishing & Trimming"
        elif "PACKING" in dept_u or "PACKING" in loc.upper() or "SEALER" in desc_u or "STRAPPING" in desc_u or "MARKING" in desc_u:
            category = "Packaging & Dispatch"

        machine_obj = {
            "id": idx,
            "sNo": s_no,
            "machineNo": mc_no,
            "description": desc,
            "department": dept,
            "location": loc,
            "specification": spec,
            "capacity": capacity,
            "make": make,
            "remarks": remarks,
            "category": category,
            "status": "ACTIVE"
        }
        machines.append(machine_obj)
        idx += 1

# Write JSON
import os
os.makedirs(os.path.dirname(json_path), exist_ok=True)
with open(json_path, "w", encoding="utf-8") as f:
    json.dump(machines, f, indent=2, ensure_ascii=False)

# Write SQL
with open(sql_path, "w", encoding="utf-8") as f:
    f.write("""-- startup-guard: bulk-seed-when-empty public.machine_master
-- Machine master list. Also safe to re-run by hand: inserts nothing if rows exist.
-- Loaded by DataInitializer ONLY when public.machine_master is empty. Data rows only: the table,
-- columns and indexes are defined in schema.sql. Enforced by StartupSafetyGuardTest.

INSERT INTO public.machine_master (s_no, machine_no, description, department, location, specification, capacity, make, remarks, category, status)
SELECT * FROM (VALUES
""")
    values = []
    for m in machines:
        def esc(val):
            if val is None or val == "":
                return "NULL"
            return "'" + str(val).replace("'", "''") + "'"
        
        v = f"({m['sNo']}, {esc(m['machineNo'])}, {esc(m['description'])}, {esc(m['department'])}, {esc(m['location'])}, {esc(m['specification'])}, {esc(m['capacity'])}, {esc(m['make'])}, {esc(m['remarks'])}, {esc(m['category'])}, 'ACTIVE')"
        values.append(v)
    f.write(",\n".join(values))
    f.write("\n) AS seed\nWHERE NOT EXISTS (SELECT 1 FROM public.machine_master);\n")

print(f"Successfully generated {len(machines)} machines in SQL and JSON!")
