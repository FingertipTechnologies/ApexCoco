import { describe, it, expect } from "vitest";
import { parseCardText, splitName } from "@/lib/extraction/heuristic-parser";

describe("parseCardText", () => {
  it("parses the Ameen Azeez demo card OCR text", () => {
    const text = ["Ameen Azeez", "Chief Revenue Officer", "Fingertip", "9495072255", "ameen@fingertipplus.com", "www.fingertipplus.com"].join("\n");
    const { contact } = parseCardText(text);
    expect(contact).toEqual({
      firstName: "Ameen",
      lastName: "Azeez",
      jobTitle: "Chief Revenue Officer",
      company: "Fingertip",
      mobile: "9495072255",
      email: "ameen@fingertipplus.com",
      website: "www.fingertipplus.com",
    });
  });

  it("survives OCR noise words and labelled numbers", () => {
    const text = ["Ameen Azeez", "Chief Revenue Officer HE Rei", "Fingertip", "M: +91 94950 72255", "T: 0484 2668100", "ameen@fingertipplus.com"].join("\n");
    const { contact } = parseCardText(text);
    expect(contact.firstName).toBe("Ameen");
    expect(contact.lastName).toBe("Azeez");
    expect(contact.mobile).toBe("+919495072255");
    expect(contact.phone).toBe("04842668100");
    expect(contact.company).toBe("Fingertip");
    expect(contact.jobTitle).toMatch(/^Chief Revenue Officer/);
  });

  it("handles a company with a legal suffix and a multi-line address", () => {
    const text = [
      "Priya Nair",
      "Director - Exports",
      "Kochi Marine Exports Pvt Ltd",
      "12 Harbour Road, Willingdon Island",
      "Kochi, Kerala 682003, India",
      "Tel: +91 484 266 8100",
      "priya@kochimarine.example.in",
      "www.kochimarine.example.in",
    ].join("\n");
    const { contact } = parseCardText(text);
    expect(contact.firstName).toBe("Priya");
    expect(contact.lastName).toBe("Nair");
    expect(contact.jobTitle).toBe("Director - Exports");
    expect(contact.company).toBe("Kochi Marine Exports Pvt Ltd");
    expect(contact.phone).toBe("+914842668100");
    expect(contact.mobile).toBeUndefined();
    expect(contact.country).toBe("India");
    expect(contact.state).toBe("Kerala");
    expect(contact.city).toBe("Kochi");
    expect(contact.address).toContain("Harbour Road");
    expect(contact.email).toBe("priya@kochimarine.example.in");
  });

  it("infers the company from the email domain when no company line exists", () => {
    const { contact } = parseCardText("Jane Okafor\nProcurement Manager\njane@acme-mfg.com\n+1 415 555 0101");
    expect(contact.company).toBe("Acme-Mfg");
    expect(contact.phone).toBe("+14155550101");
  });

  it("returns an empty contact for empty input", () => {
    expect(parseCardText("").contact).toEqual({});
  });
});

describe("splitName", () => {
  it("splits first and last names", () => {
    expect(splitName("Ameen Azeez")).toEqual({ firstName: "Ameen", lastName: "Azeez" });
  });
  it("drops honorifics and keeps compound last names", () => {
    expect(splitName("Dr. Anna Maria Rossi")).toEqual({ firstName: "Anna", lastName: "Maria Rossi" });
  });
  it("handles a single name", () => {
    expect(splitName("Madonna")).toEqual({ firstName: "Madonna" });
  });
});
