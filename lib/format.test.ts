import { describe, expect, it } from "vitest";
import { formatBitrate, formatCityCountry, formatStationCount } from "./format";

describe("format", () => {
  it("formats city and country as 'CITY, COUNTRY' (uppercased via CSS, not string case)", () => {
    expect(formatCityCountry("Paris", "France")).toBe("Paris, France");
  });

  it("formats station count with a pluralized unit", () => {
    expect(formatStationCount(1)).toBe("1 station");
    expect(formatStationCount(12)).toBe("12 stations");
  });

  it("formats bitrate with the KBPS unit", () => {
    expect(formatBitrate(128)).toBe("128 KBPS");
  });
});
