-- Machine Master DDL & Seeds
CREATE TABLE IF NOT EXISTS public.machine_master (
  id              BIGSERIAL PRIMARY KEY,
  s_no            INT,
  machine_no      VARCHAR(50) NOT NULL,
  description     VARCHAR(255) NOT NULL,
  department      VARCHAR(100),
  location        VARCHAR(150),
  specification   TEXT,
  capacity        VARCHAR(150),
  make            VARCHAR(255),
  remarks         TEXT,
  category        VARCHAR(100) DEFAULT 'General',
  status          VARCHAR(50) DEFAULT 'ACTIVE',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_machine_master_no ON public.machine_master(machine_no);
CREATE INDEX IF NOT EXISTS idx_machine_master_dept ON public.machine_master(department);
CREATE INDEX IF NOT EXISTS idx_machine_master_status ON public.machine_master(status);

TRUNCATE TABLE public.machine_master RESTART IDENTITY;

INSERT INTO public.machine_master (s_no, machine_no, description, department, location, specification, capacity, make, remarks, category, status) VALUES
(1, 'M/C -1', 'DIESEL GENERATR (DG)', 'Gate / Utility', 'GATE AREA', '160KVA, 3PHASES, 415VOLTS,222.6 AMP
FUEL TANK CAPACITY-300L,1500RPM,PF-0.8', '160 KVA', 'JAKSON CUMMINS INDIA LIMITED', NULL, 'Utility / Power', 'ACTIVE'),
(3, 'M/C -43', 'AIR COMPRESSOR', 'Store / Utility', 'STORE AREA', 'MODEL -AHS30A,RATING-22KW,POWER-30HP
PRESSSURE 8-10BAR,415VOLT,2950RPM,3PH', 'POWER-30HP', 'RANJAN''S GNAT AIR COMPRESSOR LTD', NULL, 'Utility / Power', 'ACTIVE'),
(4, 'M/C -44', '3 PHASE TRANSFORMER', 'Gate / Utility', 'GATE AREA', '315KVA, 3 PHASE, 11000HV-VOLTS.AT, 433LV-
NO LOAD, 1653HV-AMP,420LV-AMP, 50HZ', '315KVA', 'SHREE BALAJI TRANSFORMERS', NULL, 'Utility / Power', 'ACTIVE'),
(5, 'M/C -40', 'SAND BLASTING MACHINE', 'Sand Blast', 'SAND AREA', 'TANK CAPACITY-300KG,SHOT NOZZLE 5-10MM
CLEANING RATE 3-21sqr.mtr/h,60-217 cfm', '300KG', 'STERLING PORTABLE MACHINE', NULL, 'Surface Treatment', 'ACTIVE'),
(6, 'M/C -41', 'SAND BLASTING MACHINE', 'Sand Blast', 'SAND AREA', 'TANK CAPACITY-300KG,SHOT NOZZLE 5-10MM
CLEANING RATE 3-21sqr.mtr/h,60-217 cfm', '150KG', 'STERLING PORTABLE MACHINE', NULL, 'Surface Treatment', 'ACTIVE'),
(7, 'M/C -14', 'RUBBER MIXING MILL (ROLLER)', 'Rubber Compound', 'COMPOUND AREA', 'Size-14"x36",Capacity/kg-30/45,19rpm,
motor power-40hp,friction ratio-1.1.18', '30/45 kg', 'SANTEC EXIM PVT. LTD.2023', NULL, 'Rubber Compounding', 'ACTIVE'),
(8, 'M/C -15', 'KNEADER MACHINE', 'Rubber Compound', 'COMPOUND AREA', 'Model-KD-35-60,Mixing capacity-35LTR,
chamber volume-75LTR,main motor-60hp
Tilting method-hydraulic,tilting angle-140deg
tilting motor-5hp,air pressor-4/5bar', '35 LTR', 'SANTEC EXIM PVT. LTD.', NULL, 'Rubber Compounding', 'ACTIVE'),
(9, 'M/C -17', 'RUBBER MIXING MILL (ROLLER)', 'Rubber Compound', 'COMPOUND AREA', 'Size-10"x24",Capacity/kg-15/20,RPM-21,
motor power-15/20hp,friction ratio-1.1.18', '15/20 KG', 'SANTEC EXIM PVT. LTD. 2019', NULL, 'Rubber Compounding', 'ACTIVE'),
(10, 'M/C -16', 'RUBBER MIXING MILL (ROLLER)', 'Rubber Compound', 'COMPOUND AREA', 'Size-8"x18",Capacity/kg-7/10,RPM-23,
motor power-7.5/10hp,friction ratio-1.1.18', '7/10 KG', 'SANTEC EXIM PVT. LTD. 2018', NULL, 'Rubber Compounding', 'ACTIVE'),
(11, 'M/C -53', 'DIGITAL WEAGHING SEACE MACHINE', 'Rubber Compound', 'COMPOUND AREA', 'Capacity-Max-100kg,min-200gm ,power
supply-main & battery operated', '100 KG', 'Eliva company', NULL, 'Rubber Compounding', 'ACTIVE'),
(12, 'M/C -18', 'RUBBER SHEET CUTTING MACHINE', 'Rubber Compound', 'RUBBER CUTTING AREA', 'Model-TS-808A1,cut width 0-95mm,motor
power-2hp,capacity 50-55 pc/min,max feeding
width-540mm,m/c size-111x108x148 cm', '50-55 pc/min', 'Deng yi machiney industrial co.LTD', NULL, 'Rubber Compounding', 'ACTIVE'),
(13, 'M/C -44', 'HOT AIR OVEN', 'Rubber Compound', 'COMPOUND AREA', 'model-95,inner dim(18x18x18)mm
capacity-95Ltr,Temp.range-5°C to 250°C ambient,Interior-stainless steel(ss-304)
,load(kw)-3000watt,power supply-230V,', '95 LTR', 'Hot air oven', NULL, 'Rubber Compounding', 'ACTIVE'),
(14, 'M/C -2', 'Moulding Machine -STN 1 & 2', 'T/Room', 'MOULDING AREA', 'Capacity -50 Tons,platen size-12x12 inch,
machine type 4-pillar type,no.of station-Double,heating of platens-electrical heater
motor power-5hp,oil tank capacity-150Ltr', '50 Ton', 'Namdhari Rishi Enterprises Corp.', NULL, 'Tool Room & Machining', 'ACTIVE'),
(15, 'M/C -3', 'CNC ENGRAVING KAE 321', 'T/Room', 'TOOL ROOM', 'Model-KAE321,Software-mach3,axis rapid-
8000mm/min,feed rate-7000mm/min,Load on
table-60kg,positioning accuracy-0.02/0.005mm,
Driven motor-servo motor, motor spindle Speed-24000rpm,Spindle power-3kw cutting tool diameter-16mm,Z axis working area-200mmtravel size-300x200x100mm', 'motor spindle speed-24000rpm', 'Kamtronix automation', NULL, 'Tool Room & Machining', 'ACTIVE'),
(16, 'M/C -44', 'POWER PRESS MACHINE (H TYPE PILLER)', 'T/Room', 'TOOL ROOM', 'modal-PP10-100tons,dia of crank shaft-150mm,
adjustability of stroke-125mm,punch bore in ram-45mm,width/length of bad-700mm,gear dia-960mm,fly wheel dia-1000mm,stroke per min-40,motor power-10hp(1440),bore in bed-220', '100 TON', 'Millap Industrial Corporation Ltd', NULL, 'Tool Room & Machining', 'ACTIVE'),
(17, 'M/C -13', 'POWER PRESS MACHINE (H TYPE PILLER)', 'T/Room', 'TOOL ROOM', 'modal-PP5-50tons,dia of crank shaft-115mm
adjustability of stroke-100mm,punch bore in ram-38mm,width/length of bad-500mm,gear dia-650mm,fly wheel dia-800mm,stroke per min-45,motor power-7.5hp(1440),bore in bed-160', '50 TON', 'Millap Industrial Corporation Ltd', NULL, 'Tool Room & Machining', 'ACTIVE'),
(18, 'M/C -12', 'POWER PRESS MACHINE (H TYPE PILLER)', 'T/Room', 'TOOL ROOM', 'modal-PP3-30tons,dia of crank shaft-100mm
adjustability of stroke-76mm,punch bore in ram
-31mm,width/length of bad-450mm,gear dia-600mm,fly wheel dia-700mm,stroke per min-60,motor power-5hp(1440),bore in bed-140', '30 TON', 'Millap Industrial Corporation Ltd', NULL, 'Tool Room & Machining', 'ACTIVE'),
(19, 'M/C -43', 'POWER PRESS MACHINE (H TYPE PILLER)', 'T/Room', 'TOOL ROOM', 'modal-PP3-30tons,dia of crank shaft-100mm
adjustability of stroke-76mm,punch bore in ram
-31mm,width/length of bad-450mm,gear dia-600
mm,fly wheel dia-700mm,stroke per min-60,
motor power-3hp(1440),bore in bed-140', '30 TON', 'Millap Industrial Corporation Ltd', NULL, 'Tool Room & Machining', 'ACTIVE'),
(20, 'M/C -5', 'BENCH GRINDER', 'T/Room', 'TOOL ROOM', 'Model-grinder 8 inch,speed-2000rpm,wheel
diameter-200mm,width-3cm,height-20cm
depth-3cm,motor power-1hp;volts-220v', '2000rpm', 'Mech ac motor', NULL, 'Tool Room & Machining', 'ACTIVE'),
(21, 'M/C -6', 'BENCH GRINDER', 'T/Room', 'TOOL ROOM', 'Model-grinder 8 inch,speed-2800rpm,wheel
diameter-200mm,width-3cm,height-20cm
depth-3cm,motor power-2hp/3phase/600w
wheel diameter-250mm', '2800rpm', 'Mech ac motor', NULL, 'Tool Room & Machining', 'ACTIVE'),
(22, 'M/C -4', 'DRILLING MACHINE', 'T/Room', 'TOOL ROOM', 'Drilling capacity-20mm,1440rpm,3phase,1.5hp
spindle travel-255mm', 'Drilling -20mm,', 'MODERN TOOL MFRS.', NULL, 'Tool Room & Machining', 'ACTIVE'),
(23, 'M/C -10', 'LATHE ADDA MACHINE', 'T/Room', 'TOOL ROOM', 'Max-turning diameter 0-500mm,motor-2hp,
1440rpm,layout-horizontal,length of bed-3.5f', '3.5" feet', 'nanda 2020', NULL, 'Tool Room & Machining', 'ACTIVE'),
(24, 'M/C -11', 'LATHE ADDA MACHINE', 'T/Room', 'TOOL ROOM', 'Max-turning diameter 0-500mm,motor-2hp,
1440rpm,layout-horizontal,length of bed-3.5f', '3.5" feet', 'nanda 2021', NULL, 'Tool Room & Machining', 'ACTIVE'),
(25, 'M/C -7', 'LATHE MACHINE', 'T/Room', 'TOOL ROOM', 'Model HL-10,bad length-10"feet,bad width-18 inch,center form bad-16 inch,width of gap-14 inch,
swing over saddle-24 inch,swing in gap-47 inch
centres 5-8 inch,hollow spindle-3.5/8 inch,
motor power-3hp,1440rpm', '10" feet', 'YANGLRON 2020', NULL, 'Tool Room & Machining', 'ACTIVE'),
(26, 'M/C -8', 'LATHE MACHINE', 'T/Room', 'TOOL ROOM', 'Model HL-8,bad length-8"feet,bed width-16 inch
spindle bore-8 inch,distance between centre-1350
swing over bed-28 inch,centre height-14 inch,
motor-3hp,1440rpm', '8" feet', 'NANDA 2020', NULL, 'Tool Room & Machining', 'ACTIVE'),
(27, 'M/C -9', 'LATHE MACHINE', 'T/Room', 'TOOL ROOM', 'Model HL-8,bad length-8"feet,bed width-16 inch
spindle bore-8 inch,distance between centre-1350
swing over bed-28 inch,centre height-14 inch, motor-3hp,1440rpm', '8" feet', 'NANDA 2020', NULL, 'Tool Room & Machining', 'ACTIVE'),
(28, 'M/C -10', 'LATHE MACHINE', 'T/Room', 'TOOL ROOM', 'Model HL-6,bad length-6"feet,bad width-14 inch,center form bad-12 inch,width of gap-9 inch,
swing over saddle-16 inch,swing in gap-36 inch
centres 3-0 inch,hollow spindle-2.1/8 inch,
motor power-3hp,1440rpm', '6" feet', 'AMT 2021', NULL, 'Tool Room & Machining', 'ACTIVE'),
(29, 'M/C -5', 'BENCH GRINDER', 'T/Room', 'TOOL ROOM', 'HP-0.5, Phase-3, rpm-2800, Volts-400-440
Amps-1.5, Wheel Size-8 inch', '2900 rpm', 'MEC A.C MOTOR', NULL, 'Tool Room & Machining', 'ACTIVE'),
(30, 'M/C -6', 'BENCH GRINDER', 'T/Room', 'TOOL ROOM', 'HP-1, Phase-1, rpm-2800, Volts-220
Amps-4, Wheel Size-8 inch', '2800 rpm', 'MECH A.C MOTOR', NULL, 'Tool Room & Machining', 'ACTIVE'),
(31, 'M/C -29', 'Hydraulic Compression Moulding Machine -STN 1 & 2', 'Moulding', 'MOULDING AREA', 'Capacity-100 ton,Platen size-16x16 inch, Machine
type-4-piller type, No.of station-Double,Heating
of platens-Electrical heater,Control-PLC Controlled
Motor power-7 hp, oil tank capacity-250 LTR', '100 TON', 'HYDROMECH AUTOMATION PVT.LTD (DELHI) 2018', NULL, 'Moulding Press', 'ACTIVE'),
(32, 'M/C -30', 'Hydraulic Compression Moulding Machine -STN 3 & 4', 'Moulding', 'MOULDING AREA', 'Capacity-80 ton,Platen size-14x14 inch, Machine
type-4-piller type, No.of station-Double,Heating
of platens-Electrical heater,Control-PLC Controlled
Motor power-5 hp, oil tank capacity-200 LTR', '80 TON', 'TAJ HYDRAULICS PVT. LTD (DELHI) 2018', NULL, 'Moulding Press', 'ACTIVE'),
(33, 'M/C -31', 'Hydraulic Compression Moulding Machine -STN 5 & 6', 'Moulding', 'MOULDING AREA', 'Capacity-40 ton,Platen size-10X10 inch, Machine
type-4-piller type, No.of station-Double,Heating
of platens-Electrical heater,Control-PLC Controlled
Motor power-5 hp, oil tank capacity-100 LTR', '40 TON', 'NAMDHARI RISHI ENTERPRISES.CORP 2019', NULL, 'Moulding Press', 'ACTIVE'),
(34, 'M/C -32', 'Hydraulic Compression Moulding Machine -STN 7 & 8', 'Moulding', 'MOULDING AREA', 'Capacity-50 ton,Platen size-10x12 inch, Machine
type-4-piller type, No.of station-Double,Heating
of platens-Electrical heater,Control-PLC Controlled
Motor power-5 hp, oil tank capacity-150 LTR', '50 TON', 'TAJ HYDRAULICS PVT. LTD (DELHI) 2016', NULL, 'Moulding Press', 'ACTIVE'),
(35, 'M/C -33', 'Hydraulic Compression Moulding Machine -STN 9 & 10', 'Moulding', 'MOULDING AREA', 'Capacity-50 ton,Platen size-12x12 inch, Machine
type-4-piller type, No.of station-Double,Heating
of platens-Electrical heater,Control-PLC Controlled
Motor power-5 hp, oil tank capacity-150 LTR', '50 TON', 'NAMDHARI RISHI ENTERPRISES.CORP 2016', NULL, 'Moulding Press', 'ACTIVE'),
(36, 'M/C -34', 'Hydraulic Compression Moulding Machine -STN 11 & 12', 'Moulding', 'MOULDING AREA', 'Capacity-40 ton,Platen size-10x10 inch, Machine
type-4-piller type, No.of station-Double,Heating
of platens-Electrical heater,Control-PLC Controlled
Motor power-5 hp, oil tank capacity-100 LTR', '40 TON', 'D.S HYDRAULICS NEW DELHI 2018', NULL, 'Moulding Press', 'ACTIVE'),
(37, 'M/C -35', 'Hydraulic Compression Moulding Machine -STN 13 & 14', 'Moulding', 'MOULDING AREA', 'Capacity-50 ton,Platen size-12x12 inch, Machine
type-4-piller type, No.of station-Double,Heating
of platens-Electrical heater,Control-PLC Controlled
Motor power-5 hp, oil tank capacity-150 LTR', '50 TON', 'D.S HYDRAULICS NEW DELHI 2019', NULL, 'Moulding Press', 'ACTIVE'),
(38, 'M/C -20', 'LATHE ADDA MACHINE', 'Finishing', 'FINISHING AREA', 'Spindle speeds-500mm,Height of cente-220mm
motor-2hp,rpm-1400,length of bed-3.5f', '3.5" feet', 'nanda 2015', NULL, 'Tool Room & Machining', 'ACTIVE'),
(39, 'M/C -21', 'LATHE ADDA MACHINE', 'Finishing', 'FINISHING AREA', 'Spindle speeds-500mm,Height of cente-220mm
motor-1.5hp,rpm-1400,length of bed-3f', '3" feet', 'nanda 2015', NULL, 'Tool Room & Machining', 'ACTIVE'),
(40, 'M/C -22', 'LATHE ADDA MACHINE', 'Finishing', 'FINISHING AREA', 'Spindle speeds-500mm,Height of cente-220mm
motor-2hp,rpm-1400,length of bed-3.5f', '3.5" feet', 'nanda 2018', NULL, 'Tool Room & Machining', 'ACTIVE'),
(41, 'M/C -23', 'LATHE ADDA MACHINE', 'Finishing', 'FINISHING AREA', 'Spindle speeds-500mm,Height of cente-220mm
motor-2hp,rpm-1400,length of bed-3.5f', '3.5" feet', 'nanda 2018', NULL, 'Tool Room & Machining', 'ACTIVE'),
(42, 'M/C -24', 'LATHE ADDA MACHINE', 'Finishing', 'FINISHING AREA', 'Spindle speeds-500mm,Height of cente-220mm
motor-2hp,rpm-1400,length of bed-3.5f', '3.5" feet', 'nanda 2019', NULL, 'Tool Room & Machining', 'ACTIVE'),
(43, 'M/C -25', 'LATHE ADDA MACHINE', 'Finishing', 'FINISHING AREA', 'Spindle speeds-600mm,Height of cente-182mm
motor-1hp,rpm-1400,length of bed-2.5f', '2.5" feet', 'nanda 2019', NULL, 'Tool Room & Machining', 'ACTIVE'),
(44, 'M/C -19', 'CENTRELESS GRINDING MACHINE', 'Finishing', 'FINISHING AREA', 'Grinding Wheel - (Diameter 500)x(Width 150) x(Bore 305)mm, Motor-20HP,RPM-1250,
Regulating Wheel - (Diameter 300)x(Width 150) x(Bore 127)mm, Motor-3HP,RPM-300,
Mix.Grinding Dia-125mm,Min Grinding Dia-6mm', 'Mix.Grinding Dia-125mm Min Grinding Dia-6mm', 'Riat Grinders 2014', NULL, 'Finishing & Trimming', 'ACTIVE'),
(45, 'M/C -27', 'HOT AIR OVEN', 'Finishing', 'FINISHING AREA', 'model-95,inner dim(18x18x18)mm
capacity-95Ltr,Temp.range-5°C to 250°C ambient,Interior-stainless steel(ss-304)
,load(kw)-3000watt,power supply-230V,', '95 LTR', 'Hot air oven 2021', NULL, 'Finishing & Trimming', 'ACTIVE'),
(46, 'M/C -26', 'BENCH GRINDER', 'Finishing', 'FINISHING AREA', 'Model-grinder 8 inch,speed-2800rpm,wheel
diameter-200mm,width-3cm,height-20cm
depth-3cm,motor power-2hp/3phase/600w
wheel diameter-250mm', '2800 RPM', 'Mech ac motor', NULL, 'Tool Room & Machining', 'ACTIVE'),
(47, 'M/C -28', 'BUF GRINDERS', 'Finishing', 'FINISHING AREA', 'Size-10 inch, Power- 1 hp, Material- Cast Iron
Phase-3, Volt-415, RPM-1400', '1400 RPM', 'Generic India 2018', NULL, 'Tool Room & Machining', 'ACTIVE'),
(48, 'M/C -36', 'CONTINUOUS SEALER MACHINE', 'Packing', 'PACKING AREA', 'Modal-FR900,Voltage-220V,50HZ, Power-500W
Sealing Speed 0-12(m/min), Sealing width 6-12mm
Temperature Range 0-300,Max Conveyor Load-3kg', '0-12m/min', 'Shyam Enterprises 2019', NULL, 'Packaging & Dispatch', 'ACTIVE'),
(49, 'M/C -37', 'SAMI AUTOMATIC BOX STRAPPING MACHINE', 'Packing', 'PACKING AREA', 'Modol-Table top SP101H, Strapping Force-450
Newton, Min.Strap Size-1.5m/sec, Strap Width
6-15mm, Power Source-220V/50HZ/1HP', '1.5M/SEC', 'Galaxy Industies Pvt.Ltd 2019', NULL, 'Packaging & Dispatch', 'ACTIVE'),
(50, 'M/C -38', 'LASER MARKING MACHINE', 'Packing', 'PACKING AREA', 'Modal-PL30W,Marking Speed-700mm/s, Power-
30w,marking depth-0.1mm~2mm,Marking area-
100x100mm, Laser wave length-1064nm', '700mm/s', 'Ruanmi Technology Pvt.Ltd 2019', NULL, 'Packaging & Dispatch', 'ACTIVE'),
(51, 'M/C -39', 'BUF GRINDERS', 'Packing', 'PACKING AREA', 'Size-10 inch, Power- 1 hp, Material- Cast Iron
Phase-3, Volt-415, RPM-1400', '1400 RPM', 'Generic India 2018', NULL, 'Tool Room & Machining', 'ACTIVE'),
(52, 'M/C -48', 'LIQUID SPRAY PAINT BOOTH', 'Packing', 'PACKING AREA', 'Booth size-10x6 feet, Air-flow direction-Cross-flow
Body material-mild steel ,Blower motor-2 hp', '10x6 feet', 'Krishna Scientific Works 2020', NULL, 'Packaging & Dispatch', 'ACTIVE');
