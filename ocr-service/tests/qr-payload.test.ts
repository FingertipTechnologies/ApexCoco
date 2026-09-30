import { describe, it, expect } from "vitest";
import { parseQrPayload, parseVCard, parseMeCard } from "@/lib/qr/contact-payload";

describe("parseVCard", () => {
  it("parses the demo vCard", () => {
    const vcard = ["BEGIN:VCARD", "VERSION:3.0", "N:Azeez;Ameen;;;", "FN:Ameen Azeez", "ORG:Fingertip", "TITLE:Chief Revenue Officer", "TEL;TYPE=CELL:9495072255", "EMAIL:ameen@fingertipplus.com", "URL:https://www.fingertipplus.com", "END:VCARD"].join("\r\n");
    expect(parseVCard(vcard)).toEqual({
      firstName: "Ameen",
      lastName: "Azeez",
      jobTitle: "Chief Revenue Officer",
      company: "Fingertip",
      mobile: "9495072255",
      email: "ameen@fingertipplus.com",
      website: "https://www.fingertipplus.com",
    });
  });

  it("uses FN when N is missing, splits ADR and distinguishes work phones", () => {
    const vcard = ["BEGIN:VCARD", "FN:Jane Okafor", "TEL;TYPE=WORK,VOICE:+1 415 555 0101", "TEL;TYPE=CELL:+1 415 555 0199", "ADR;TYPE=WORK:;;1 Market St;San Jose;CA;95113;United States", "END:VCARD"].join("\n");
    const c = parseVCard(vcard);
    expect(c.firstName).toBe("Jane");
    expect(c.lastName).toBe("Okafor");
    expect(c.phone).toBe("+1 415 555 0101");
    expect(c.mobile).toBe("+1 415 555 0199");
    expect(c.address).toBe("1 Market St");
    expect(c.city).toBe("San Jose");
    expect(c.state).toBe("CA");
    expect(c.country).toBe("United States");
  });
});

describe("parseMeCard", () => {
  it("parses MeCard payloads", () => {
    const c = parseMeCard("MECARD:N:Azeez,Ameen;ORG:Fingertip;TEL:9495072255;EMAIL:ameen@fingertipplus.com;URL:fingertipplus.com;;");
    expect(c).toMatchObject({ firstName: "Ameen", lastName: "Azeez", company: "Fingertip", mobile: "9495072255", email: "ameen@fingertipplus.com", website: "fingertipplus.com" });
  });
});

describe("parseQrPayload", () => {
  it("classifies formats", () => {
    expect(parseQrPayload("BEGIN:VCARD\nFN:A B\nEND:VCARD").format).toBe("vcard");
    expect(parseQrPayload("MECARD:N:B,A;;").format).toBe("mecard");
    expect(parseQrPayload("https://fingertipplus.com")).toEqual({ format: "url", contact: { website: "https://fingertipplus.com" } });
    expect(parseQrPayload("hello world").format).toBe("text");
  });
});
