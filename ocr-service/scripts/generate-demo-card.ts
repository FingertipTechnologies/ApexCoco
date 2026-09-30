/**
 * Renders the demo visiting card (Ameen Azeez, Fingertip) to
 * public/demo/ameen-azeez-card.png, including a QR code that carries the
 * same contact as a vCard. The app never reads these values directly: the
 * PNG is uploaded and goes through OCR + QR decoding like any real card.
 *
 *   npm run demo:card
 */
import sharp from "sharp";
import QRCode from "qrcode";
import fs from "node:fs/promises";
import path from "node:path";

const card = {
  firstName: "Ameen",
  lastName: "Azeez",
  title: "Chief Revenue Officer",
  company: "Fingertip",
  mobile: "9495072255",
  email: "ameen@fingertipplus.com",
  website: "www.fingertipplus.com",
};

const vcard = [
  "BEGIN:VCARD",
  "VERSION:3.0",
  `N:${card.lastName};${card.firstName};;;`,
  `FN:${card.firstName} ${card.lastName}`,
  `ORG:${card.company}`,
  `TITLE:${card.title}`,
  `TEL;TYPE=CELL:${card.mobile}`,
  `EMAIL:${card.email}`,
  `URL:https://${card.website}`,
  "END:VCARD",
].join("\r\n");

const W = 1050;
const H = 600;

async function main() {
  const qrPng = await QRCode.toBuffer(vcard, { type: "png", width: 260, margin: 1, errorCorrectionLevel: "M" });

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" rx="24" fill="#ffffff"/>
  <rect x="0" y="0" width="18" height="${H}" fill="#0b5cab"/>
  <rect x="18" y="0" width="6" height="${H}" fill="#1b96ff"/>
  <text x="80" y="150" font-family="DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif" font-size="58" font-weight="700" fill="#032d60">${card.firstName} ${card.lastName}</text>
  <text x="80" y="205" font-family="DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif" font-size="30" fill="#444444">${card.title}</text>
  <text x="80" y="270" font-family="DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif" font-size="40" font-weight="700" fill="#0b5cab">${card.company}</text>
  <line x1="80" y1="310" x2="640" y2="310" stroke="#d8dde6" stroke-width="3"/>
  <text x="80" y="380" font-family="DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif" font-size="32" fill="#222222">${card.mobile}</text>
  <text x="80" y="440" font-family="DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif" font-size="32" fill="#222222">${card.email}</text>
  <text x="80" y="500" font-family="DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif" font-size="28" fill="#555555">${card.website}</text>
</svg>`;

  const outDir = path.join(process.cwd(), "public", "demo");
  await fs.mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, "ameen-azeez-card.png");

  await sharp(Buffer.from(svg))
    .composite([{ input: qrPng, left: W - 260 - 90, top: 170 }])
    .png()
    .toFile(outFile);

  console.log(`Wrote ${path.relative(process.cwd(), outFile)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
