/**
 * Unit tests for the Lightning web component service module
 * force-app/main/default/lwc/visitingCardParser (pure JS, no LWC imports).
 */
import { describe, it, expect } from "vitest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - plain JS module from the Salesforce package directory
import * as parserModule from "../../force-app/main/default/lwc/visitingCardParser/visitingCardParser.js";

type Contact = Record<string, string | undefined>;
type Layer = { source: string; contact: Contact };
const parser = parserModule as unknown as {
  parseCardText: (text: string) => { contact: Contact; unclassified: string[] };
  parseVCard: (text: string) => Contact;
  parseMeCard: (text: string) => Contact;
  parseQrPayload: (raw: string) => { format: string; contact: Contact };
  mergeLayers: (layers: Layer[]) => { contact: Contact; sources: Record<string, string> };
  splitName: (name: string) => Contact;
  scanStatusFor: (contact: Contact) => string;
};
const { parseCardText, parseVCard, parseMeCard, parseQrPayload, mergeLayers, splitName, scanStatusFor } = parser;

describe("LWC visitingCardParser.parseCardText", () => {
  it("parses the Ameen Azeez card text", () => {
    const { contact } = parseCardText("Ameen Azeez\nChief Revenue Officer\nFingertip\n9495072255\nameen@fingertipplus.com\nwww.fingertipplus.com");
    expect(contact).toEqual({ firstName: "Ameen", lastName: "Azeez", title: "Chief Revenue Officer", company: "Fingertip", mobile: "9495072255", email: "ameen@fingertipplus.com", website: "www.fingertipplus.com" });
  });

  it("parses the ABC Foods International demo card", () => {
    const { contact } = parseCardText("John Smith\nProcurement Manager\nABC Foods International\nT: +1 415 555 0100\njohn.smith@abcfoods.com\nabcfoods.com\nSan Francisco, CA 94105, USA");
    expect(contact.firstName).toBe("John");
    expect(contact.lastName).toBe("Smith");
    expect(contact.title).toBe("Procurement Manager");
    expect(contact.company).toBe("ABC Foods International");
    expect(contact.phone).toBe("+14155550100");
    expect(contact.email).toBe("john.smith@abcfoods.com");
    expect(contact.website).toBe("abcfoods.com");
    expect(contact.country).toBe("USA");
  });

  it("handles noise and labelled numbers", () => {
    const { contact } = parseCardText("Ameen Azeez\nChief Revenue Officer HE Rei\nFingertip\nM: +91 94950 72255\nT: 0484 2668100\nameen@fingertipplus.com");
    expect(contact.mobile).toBe("+919495072255");
    expect(contact.phone).toBe("04842668100");
    expect(contact.company).toBe("Fingertip");
  });

  it("returns nothing for empty text", () => {
    expect(parseCardText("").contact).toEqual({});
    expect(scanStatusFor({})).toBe("Failed");
  });
});

describe("LWC visitingCardParser QR payloads", () => {
  it("parses vCard", () => {
    const v = ["BEGIN:VCARD", "VERSION:3.0", "N:Azeez;Ameen;;;", "FN:Ameen Azeez", "ORG:Fingertip", "TITLE:Chief Revenue Officer", "TEL;TYPE=CELL:9495072255", "EMAIL:ameen@fingertipplus.com", "URL:https://www.fingertipplus.com", "END:VCARD"].join("\r\n");
    expect(parseVCard(v)).toEqual({ firstName: "Ameen", lastName: "Azeez", title: "Chief Revenue Officer", company: "Fingertip", mobile: "9495072255", email: "ameen@fingertipplus.com", website: "https://www.fingertipplus.com" });
    expect(parseQrPayload(v).format).toBe("vcard");
  });
  it("parses MeCard and URLs", () => {
    expect(parseMeCard("MECARD:N:Smith,John;ORG:ABC Foods International;TEL:+14155550100;EMAIL:john.smith@abcfoods.com;;")).toMatchObject({ firstName: "John", lastName: "Smith", company: "ABC Foods International", mobile: "+14155550100" });
    expect(parseQrPayload("https://abcfoods.com")).toEqual({ format: "url", contact: { website: "https://abcfoods.com" } });
    expect(parseQrPayload("hello").format).toBe("text");
  });
});

describe("LWC visitingCardParser.mergeLayers", () => {
  it("gives QR priority, tracks sources and de-duplicates phones", () => {
    const { contact, sources } = mergeLayers([
      { source: "qr", contact: { firstName: "Ameen", mobile: "9495072255" } },
      { source: "ocr", contact: { firstName: "Arneen", lastName: "Azeez", phone: "+91 9495072255", company: "Fingertip" } }
    ]);
    expect(contact).toEqual({ firstName: "Ameen", lastName: "Azeez", mobile: "9495072255", company: "Fingertip" });
    expect(sources).toEqual({ firstName: "qr", mobile: "qr", lastName: "ocr", company: "ocr" });
    expect(scanStatusFor(contact)).toBe("Extracted");
    expect(scanStatusFor({ firstName: "Ameen", lastName: "Azeez" })).toBe("Partially Extracted");
  });
  it("splits names", () => {
    expect(splitName("Dr. Anna Maria Rossi")).toEqual({ firstName: "Anna", lastName: "Maria Rossi" });
  });
});
