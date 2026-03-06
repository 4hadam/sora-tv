import express, { type Express } from "express";
import fs from "fs";
import path from "path";

// Reverse map: code -> country name
const CODE_TO_COUNTRY: Record<string, string> = {
  af: "Afghanistan", al: "Albania", dz: "Algeria", ad: "Andorra", ao: "Angola", ar: "Argentina", am: "Armenia", au: "Australia", at: "Austria", az: "Azerbaijan", bs: "Bahamas", bh: "Bahrain", bd: "Bangladesh", bb: "Barbados", by: "Belarus", be: "Belgium", bz: "Belize", bj: "Benin", bt: "Bhutan", bo: "Bolivia", ba: "Bosnia and Herzegovina", bw: "Botswana", br: "Brazil", bn: "Brunei", bg: "Bulgaria", bf: "Burkina Faso", bi: "Burundi", kh: "Cambodia", cm: "Cameroon", ca: "Canada", cv: "Cape Verde", cf: "Central African Republic", td: "Chad", cl: "Chile", cn: "China", co: "Colombia", km: "Comoros", cg: "Congo", cd: "DR Congo", cr: "Costa Rica", hr: "Croatia", cu: "Cuba", cy: "Cyprus", cz: "Czech Republic", dk: "Denmark", dj: "Djibouti", do: "Dominican Republic", ec: "Ecuador", eg: "Egypt", sv: "El Salvador", gq: "Equatorial Guinea", er: "Eritrea", ee: "Estonia", et: "Ethiopia", fj: "Fiji", fi: "Finland", fr: "France", ga: "Gabon", gm: "Gambia", ge: "Georgia", de: "Germany", gh: "Ghana", gr: "Greece", gt: "Guatemala", gn: "Guinea", gw: "Guinea-Bissau", gy: "Guyana", ht: "Haiti", hn: "Honduras", hu: "Hungary", is: "Iceland", in: "India", id: "Indonesia", ir: "Iran", iq: "Iraq", ie: "Ireland", il: "Israel", it: "Italy", jm: "Jamaica", jp: "Japan", jo: "Jordan", kz: "Kazakhstan", ke: "Kenya", kw: "Kuwait", kg: "Kyrgyzstan", la: "Laos", lv: "Latvia", lb: "Lebanon", ls: "Lesotho", lr: "Liberia", ly: "Libya", li: "Liechtenstein", lt: "Lithuania", lu: "Luxembourg", mk: "North Macedonia", mg: "Madagascar", mw: "Malawi", my: "Malaysia", mv: "Maldives", ml: "Mali", mt: "Malta", mr: "Mauritania", mu: "Mauritius", mx: "Mexico", md: "Moldova", mc: "Monaco", mn: "Mongolia", me: "Montenegro", ma: "Morocco", mz: "Mozambique", mm: "Myanmar", na: "Namibia", np: "Nepal", nl: "Netherlands", nz: "New Zealand", ni: "Nicaragua", ne: "Niger", ng: "Nigeria", no: "Norway", om: "Oman", pk: "Pakistan", ps: "Palestine", pa: "Panama", pg: "Papua New Guinea", py: "Paraguay", pe: "Peru", ph: "Philippines", pl: "Poland", pt: "Portugal", qa: "Qatar", ro: "Romania", ru: "Russia", rw: "Rwanda", sa: "Saudi Arabia", sn: "Senegal", rs: "Serbia", sl: "Sierra Leone", sg: "Singapore", sk: "Slovakia", si: "Slovenia", so: "Somalia", za: "South Africa", ss: "South Sudan", es: "Spain", lk: "Sri Lanka", sd: "Sudan", sr: "Suriname", sz: "Eswatini", se: "Sweden", ch: "Switzerland", sy: "Syria", tw: "Taiwan", tj: "Tajikistan", tz: "Tanzania", th: "Thailand", tl: "Timor-Leste", tg: "Togo", tt: "Trinidad and Tobago", tn: "Tunisia", tr: "Turkey", tm: "Turkmenistan", ug: "Uganda", ua: "Ukraine", ae: "United Arab Emirates", gb: "United Kingdom", us: "United States", uy: "Uruguay", uz: "Uzbekistan", ve: "Venezuela", vn: "Vietnam", ye: "Yemen", zm: "Zambia", zw: "Zimbabwe"
};

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Cache immutable hashed assets for 1 year, HTML for 0
  app.use(
    express.static(distPath, {
      setHeaders(res, filePath) {
        if (/\.(js|css|woff2?|png|svg|ico|webp)$/.test(filePath)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    })
  );

  // fall through to index.html with SSR meta injection for country pages
  app.use("/{*path}", (req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    const indexPath = path.resolve(distPath, "index.html");
    let html = fs.readFileSync(indexPath, "utf-8");

    // Check if this is a country page (e.g. /us, /ma, /fr)
    const match = req.path.match(/^\/([a-z]{2})$/i);
    if (match) {
      const code = match[1].toLowerCase();
      const country = CODE_TO_COUNTRY[code];
      if (country) {
        const title = `${country} Live TV Channels - Sora tv`;
        const description = `Watch free live TV channels from ${country}. Stream news, sports, and entertainment from ${country} on Sora tv.`;
        const canonical = `https://soratv.live/${code}`;
        html = html
          .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
          .replace(/<meta name="description"[^>]*\/?>/, `<meta name="description" content="${description}" />`)
          .replace(/<link rel="canonical"[^>]*\/?>/, `<link rel="canonical" href="${canonical}" />`);
        // Add canonical if missing
        if (!html.includes(`rel="canonical"`)) {
          html = html.replace("</head>", `  <link rel="canonical" href="${canonical}" />\n</head>`);
        }
      }
    }

    res.send(html);
  });
}
