import { describe, it, expect } from "vitest";
import { mergeContactLayers } from "@/lib/extraction/merge";

describe("mergeContactLayers", () => {
  it("gives priority to earlier layers and records sources", () => {
    const { contact, sources } = mergeContactLayers([
      { source: "qr", contact: { firstName: "Ameen", email: "ameen@fingertipplus.com" } },
      { source: "ocr", contact: { firstName: "Arneen", lastName: "Azeez", email: "ameen@fingertipplus.com", company: "Fingertip" } },
    ]);
    expect(contact).toEqual({ firstName: "Ameen", lastName: "Azeez", email: "ameen@fingertipplus.com", company: "Fingertip" });
    expect(sources).toEqual({ firstName: "qr", email: "qr", lastName: "ocr", company: "ocr" });
  });

  it("drops a phone that duplicates the mobile", () => {
    const { contact } = mergeContactLayers([{ source: "ocr", contact: { mobile: "+91 9495072255", phone: "9495072255" } }]);
    expect(contact).toEqual({ mobile: "+91 9495072255" });
  });

  it("ignores blank values", () => {
    const { contact } = mergeContactLayers([{ source: "qr", contact: { firstName: "  " } }, { source: "ocr", contact: { firstName: "Ameen" } }]);
    expect(contact.firstName).toBe("Ameen");
  });
});
