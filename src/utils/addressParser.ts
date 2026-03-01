/**
 * Thai Address Parser Utility
 * แยกที่อยู่รวมภาษาไทยเป็นฟิลด์ย่อยอัตโนมัติ
 */

export interface ParsedAddress {
  address_number: string;
  village: string;
  building: string;
  room_number: string;
  floor_number: string;
  soi: string;
  moo: string;
  road: string;
  subdistrict: string;
  district: string;
  province: string;
  postal_code: string;
}

/**
 * Parse a Thai full address string into structured sub-fields.
 *
 * Supports patterns like:
 * "123/4 หมู่บ้านสุขสันต์ อาคารเอบีซี ห้อง 501 ชั้น 5 ซอยลาดพร้าว 1 หมู่ 3 ถนนลาดพร้าว แขวงจอมพล เขตจตุจักร กรุงเทพมหานคร 10900"
 */
export function parseThaiAddress(fullAddress: string): ParsedAddress {
  const result: ParsedAddress = {
    address_number: "",
    village: "",
    building: "",
    room_number: "",
    floor_number: "",
    soi: "",
    moo: "",
    road: "",
    subdistrict: "",
    district: "",
    province: "",
    postal_code: "",
  };

  if (!fullAddress || !fullAddress.trim()) return result;

  let addr = fullAddress.trim();

  // 1. Extract postal code (5-digit number, usually at the end)
  const postalMatch = addr.match(/(?:รหัสไปรษณีย์\s*)?(\d{5})\s*$/);
  if (postalMatch) {
    result.postal_code = postalMatch[1];
    addr = addr.replace(postalMatch[0], "").trim();
  }

  // List of standard thai address prefixes
  const ADDR_KEYS = [
    { key: "postal_code", prefixes: ["รหัสไปรษณีย์", ""] }, // Has special regex
    {
      key: "province",
      prefixes: ["จังหวัด", "จ.", "กรุงเทพมหานคร", "กรุงเทพฯ", "กรุงเทพ"],
    },
    {
      key: "district",
      prefixes: ["อำเภอ/เขต", "เขต/อำเภอ", "อำเภอ", "เขต", "อ."],
    },
    {
      key: "subdistrict",
      prefixes: ["แขวง/ตำบล", "ตำบล/แขวง", "แขวง", "ตำบล", "ต."],
    },
    { key: "road", prefixes: ["ถนน", "ถ."] },
    { key: "soi", prefixes: ["ซอย", "ซ."] },
    { key: "moo", prefixes: ["หมู่ที่", "หมู่", "ม."] }, // "หมู่บ้าน" is handled separately to avoid clash
    { key: "village", prefixes: ["หมู่บ้าน"] },
    { key: "building", prefixes: ["อาคาร", "ตึก"] },
    { key: "room_number", prefixes: ["ห้องเลขที่", "ห้อง"] },
    { key: "floor_number", prefixes: ["ชั้นที่", "ชั้น"] },
  ];

  addr = addr.replace(/\s+/g, " ").trim(); // Normalize spaces

  // Helper macro to extract a field.
  // It looks for "PREFIX [Value] [Space OR Next Prefix]"
  const extractField = (
    fieldKey: keyof ParsedAddress,
    prefixes: string[],
    isNumeric: boolean = false,
  ) => {
    for (const prefix of prefixes) {
      if (!prefix) continue;

      // Escape prefix for regex
      const safePrefix = prefix.replace(/\./g, "\\.");

      // Regex logic:
      // 1. Match the prefix exactly
      // 2. Allow spaces after prefix
      // 3. Capture the value:
      //    if isNumeric: capture continuous non-space characters (digits)
      //    otherwise: capture until the next known prefix from ADDR_KEYS, or end of string

      // Build a lookahead of ALL prefixes to stop at
      const allPrefixes = ADDR_KEYS.flatMap((k) => k.prefixes)
        .filter((p) => p.length > 0)
        .map((p) => p.replace(/\./g, "\\."))
        .join("|");

      const regexStr = `(?:${safePrefix})\\s*(.*?)(?=\\s+(?:${allPrefixes})|$)`;
      const regex = new RegExp(regexStr, "i");

      const match = addr.match(regex);

      if (match) {
        const extractedValue = match[1].trim();

        // Special case: If the user types "ซอย หมู่" and the system tries to extract Soi,
        // it will see "ซอย" (prefix) and "หมู่" (next prefix), causing match[1] to be empty.
        // If it's empty, we just remove the prefix and don't save the empty value.
        if (extractedValue !== "") {
          if (isNumeric && !/^\d+/.test(extractedValue)) {
            // If we expect a number (like moo, floor) but get text, skip it
            continue;
          }

          result[fieldKey] = extractedValue;
        }

        // Remove the matched segment from the address string
        addr = addr.replace(match[0], "").trim();
        return true;
      }
    }
    return false;
  };

  // Special Province extraction for "กรุงเทพมหานคร" without prefix
  if (/กรุงเทพมหานคร|กรุงเทพฯ|กรุงเทพ/.test(addr)) {
    result.province = "กรุงเทพมหานคร";
    addr = addr
      .replace(
        /จังหวัด\s*กรุงเทพมหานคร|จังหวัด\s*กรุงเทพฯ|จังหวัด\s*กรุงเทพ|กรุงเทพมหานคร|กรุงเทพฯ|กรุงเทพ/,
        "",
      )
      .trim();
  } else {
    extractField("province", ["จังหวัด", "จ."]);
  }

  extractField("district", ["อำเภอ/เขต", "เขต/อำเภอ", "อำเภอ", "เขต", "อ."]);
  extractField("subdistrict", ["แขวง/ตำบล", "ตำบล/แขวง", "แขวง", "ตำบล", "ต."]);
  extractField("road", ["ถนน", "ถ."]);

  // Extract Village before Moo to prevent "หมู่บ้าน" being caught by "หมู่"
  extractField("village", ["หมู่บ้าน"]);
  extractField("moo", ["หมู่ที่", "หมู่", "ม."], true);

  extractField("soi", ["ซอย", "ซ."]);

  extractField("floor_number", ["ชั้นที่", "ชั้น"], true);
  extractField("room_number", ["ห้องเลขที่", "ห้อง"]);
  extractField("building", ["อาคาร", "ตึก"]);

  // Extract Address Number (เลขที่)
  const addrNumMatch = addr.match(/(?:เลขที่|บ้านเลขที่)\s*(\S+)/);
  if (addrNumMatch) {
    result.address_number = addrNumMatch[1];
    addr = addr.replace(addrNumMatch[0], "").trim();
  } else {
    // Look for leading numbers like "123/4"
    const leadingNumMatch = addr.match(/^(\d+(?:[/-]\d+)?(?:[A-Za-zก-ฮ])?)/);
    if (leadingNumMatch) {
      result.address_number = leadingNumMatch[1];
      addr = addr.replace(leadingNumMatch[0], "").trim();
    }
  }

  // Clean trailing commas and spaces from leftover text
  addr = addr.replace(/^[, ]+|[, ]+$/g, "");

  // If there's leftover text, it usually belongs to the Building Name or Company Name
  // (e.g. "สิริกร" in "สิริกร 601 6 เลขที่ 114...")
  if (addr.length > 0 && !result.building) {
    result.building = addr;
  }

  return result;
}
