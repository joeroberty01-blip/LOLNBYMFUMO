/**
 * Assigns BODY PARTS / ENGINE PARTS to a Book3 part name, learned from the user's own
 * JOSEPH 2-6-26.xlsx — the only sheet in it that actually splits the two is "Store 1" (55 rows),
 * and its decisions are taken literally even where they are not principled:
 *
 *   BRAKE SHOE -> BODY   but  HAND BRAKE SHOE -> ENGINE
 *   WIPER ARM  -> BODY   but  WIPER BLADE     -> ENGINE
 *   FUEL PUMP  -> BODY   (not engine)
 *
 * RULES ARE ORDERED AND THE FIRST MATCH WINS, so a specific phrase always beats the general word
 * inside it: "WHEEL CYLINDER" is a brake part and must be tested before the bare "CYLINDER",
 * "RELEASE BEARING" is a clutch part and must beat the bare "BEARING", and so on. Grouping the
 * rules by category instead of by specificity is what silently mis-filed them before.
 *
 * Anything no rule matches is deliberately left as the app's own "Uncategorized" default rather
 * than pushed into whichever bucket looks closer — a wrong category is worse than none, and the
 * admin can set it inside the app at any time. Most of what lands there is a row whose name was
 * already truncated in Book3 itself and contains no product word at all.
 */

export const ENGINE = "ENGINE PARTS";
export const BODY = "BODY PARTS";
export const UNKNOWN = "Uncategorized";

type Source = "JOSEPH" | "phrase" | "keyword";
type Rule = { match: string; category: string; source: Source };

const J = (match: string, category: string): Rule => ({ match, category, source: "JOSEPH" });
const P = (match: string, category: string): Rule => ({ match, category, source: "phrase" });
const K = (match: string, category: string): Rule => ({ match, category, source: "keyword" });

const RULES: Rule[] = [
  // ---- Tier 1: taken verbatim from JOSEPH "Store 1" -------------------------------------
  J("HAND BRAKE SHOE", ENGINE),
  J("HAND BRAKE CABLE", BODY),
  J("BRAKE FLUID", ENGINE),
  J("BRAKE SHOE", BODY),
  J("WIPER BLADE", ENGINE),
  J("WIPER ARM", BODY),
  J("AIR CLEANER", ENGINE),
  J("AIR CLENER", ENGINE),
  J("FAN BELT", ENGINE),
  J("ENGINE VALVE", ENGINE),
  J("MAIN & CON", ENGINE),
  J("CON BEARING", ENGINE),
  J("OIL COOLER", ENGINE),
  J("ENGINE OIL", ENGINE),
  J("COOLANT", ENGINE),
  J("DIESEL TREATMENT", ENGINE),
  J("HYDRAULIC", ENGINE),
  J("GREASE", ENGINE),
  J("HUB BEARING", BODY),
  J("WHEEL NUT", BODY),
  J("SPIRAL CABLE", BODY),
  J("SPRING BUSH", BODY),
  J("STABLIZER BUSH", BODY),
  J("STABILIZER BUSH", BODY),
  J("SHUCKLE", BODY),
  J("SHOCKABSORBER", BODY),
  J("FUEL PUMP", BODY),
  J("C.M.C", BODY),
  J("STABLE EXCEL", BODY),

  // ---- Tier 2: phrases that must beat a general word they contain ------------------------
  P("WHEEL CYLINDER", BODY), // brake, not engine
  P("MASTER CYLINDER", BODY), // brake, not engine
  P("B.M.C", BODY), // brake master cylinder
  P("CYLINDER HEAD", ENGINE),
  P("HEAD GASKET", ENGINE),
  P("RELEASE BEARING", ENGINE), // clutch
  P("PILOT BEARING", ENGINE), // clutch
  P("THRUST BEARING", ENGINE),
  P("CENTER BEARING", BODY), // propeller shaft
  P("CENTRE BEARING", BODY),
  P("WHEEL BEARING", BODY),
  P("CAMSHAFT", ENGINE),
  P("CRANKSHAFT", ENGINE),
  P("DRIVE SHAFT", BODY),
  P("DRIVING SHAFT", BODY),
  P("PROPELLER", BODY),
  P("TOP SHAFT", BODY), // gearbox
  P("MAIN SHAFT", BODY), // gearbox
  P("OIL SEAL", ENGINE),
  P("OIL FILTER", ENGINE),
  P("OIL PUMP", ENGINE),
  P("WATER PUMP", ENGINE),
  P("FEED PUMP", ENGINE),
  P("SUPPLY PUMP", ENGINE),
  P("POWER STEERING", BODY),
  P("EXPANSION VALVE", ENGINE), // air-conditioning
  P("VALVE SEAL", ENGINE),
  P("VALVE GUIDE", ENGINE),
  P("VALVE STEM", ENGINE),
  P("ROTOR HEAD", ENGINE), // injection pump
  P("DISC ROTOR", BODY), // brake
  P("TIE ROD", BODY),
  P("RACK END", BODY),
  P("BALL JOINT", BODY),
  P("X-JOINT", BODY),
  P("C.V.JOINT", BODY),

  // ---- Tier 3: general single words ------------------------------------------------------
  // Engine internals, fuel/ignition, cooling, air-conditioning and service consumables —
  // extending JOSEPH's own habit of filing service items (AIR CLEANER, FAN BELT) under ENGINE.
  K("OVERHAUL", ENGINE),
  K("OVERHAULL", ENGINE),
  K("GASKET", ENGINE),
  K("PISTON", ENGINE),
  K("NOZZLE", ENGINE),
  K("NOZZEL", ENGINE),
  K("INJECTOR", ENGINE),
  K("TURBO", ENGINE),
  K("LINER", ENGINE),
  K("CON ROD", ENGINE),
  K("TIMING", ENGINE),
  K("GLOW", ENGINE),
  K("SPARK", ENGINE),
  K("PLUG", ENGINE),
  K("FILTER", ENGINE),
  K("RADIATOR", ENGINE),
  K("THERMOSTAT", ENGINE),
  K("INTERCOOLER", ENGINE),
  K("MANIFOLD", ENGINE),
  K("EXHAUST", ENGINE),
  K("MUFFLER", ENGINE),
  K("ALTERNATOR", ENGINE),
  K("STARTER", ENGINE),
  K("COMPRESSOR", ENGINE),
  K("CONDENSOR", ENGINE),
  K("CONDENSER", ENGINE),
  K("EVAPORATOR", ENGINE),
  K("BLOWER", ENGINE),
  K("HEATER", ENGINE),
  K("CLUTCH", ENGINE),
  K("FLYWHEEL", ENGINE),
  K("SYNCHRONIZER", ENGINE),
  K("SYNCREON", ENGINE),
  K("CAMPLATE", ENGINE), // injection-pump cam plate
  K("TENSIONER", ENGINE),
  K("PULLEY", ENGINE),
  K("CHAIN", ENGINE),
  K("VALVE", ENGINE),
  K("CYLINDER", ENGINE),
  K("ENGINE", ENGINE),
  K("SEAL", ENGINE),
  K("OIL", ENGINE),
  K("FAN", ENGINE),

  // Suspension, steering, braking hardware, driveline, body panels, lighting, electrical trim.
  K("BRAKE", BODY),
  K("ABS", BODY),
  K("PADS", BODY),
  K("PAD", BODY),
  K("DISC", BODY),
  K("DRUM", BODY),
  K("CALLIPER", BODY),
  K("CALIPER", BODY),
  K("BOOSTER", BODY),
  K("SHOCK", BODY),
  K("SPRING", BODY),
  K("BUSH", BODY),
  K("BUFFER", BODY),
  K("RUBBER", BODY),
  K("ARM", BODY),
  K("STEERING", BODY),
  K("RACK", BODY),
  K("STABILIZER", BODY),
  K("STABLIZER", BODY),
  K("LINK", BODY),
  K("HUB", BODY),
  K("WHEEL", BODY),
  K("KNUCKLE", BODY),
  K("KNUCLE", BODY),
  K("AXLE", BODY),
  K("AXEL", BODY),
  K("SHAFT", BODY),
  K("UNIVERSAL", BODY),
  K("DIFF", BODY),
  K("GEARBOX", BODY),
  K("GEAR", BODY),
  K("BEARING", BODY),
  K("LAMP", BODY),
  K("LIGHT", BODY),
  K("BULB", BODY),
  K("MIRROR", BODY),
  K("GRILL", BODY),
  K("BUMPER", BODY),
  K("FENDER", BODY),
  K("BONET", BODY),
  K("BONNET", BODY),
  K("DOOR", BODY),
  K("WINDOW", BODY),
  K("HANDLE", BODY),
  K("LOCK", BODY),
  K("SWITCH", BODY),
  K("SENSOR", BODY),
  K("CABLE", BODY),
  K("MOUNTING", BODY),
  K("BOLT", BODY),
  K("NUT", BODY),
  K("WASHER", BODY),
  K("SEAT", BODY),
  K("SPOILER", BODY),
  K("MOLDING", BODY),
  K("STICKER", BODY),
  K("WIPER", BODY),
  K("BATTERY", BODY),
  K("HORN", BODY),
  K("SNORKEL", BODY),
  K("STEP", BODY),
  K("TIE", BODY),
  K("JOINT", BODY),
  K("EXCEL", BODY),
];

export type Classified = { category: string; rule: string; source: Source | "none" };

export function categorize(name: string): Classified {
  const upper = name.toUpperCase();
  for (const r of RULES) {
    if (upper.includes(r.match)) return { category: r.category, rule: r.match, source: r.source };
  }
  return { category: UNKNOWN, rule: "", source: "none" };
}
