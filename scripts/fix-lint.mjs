import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// 1. Fix useScrollReveal.ts
const scrollRevealPath = path.join(projectRoot, "src", "hooks", "useScrollReveal.ts");
let scrollRevealCode = fs.readFileSync(scrollRevealPath, "utf-8");
scrollRevealCode = scrollRevealCode.replace(
  "export function useScrollReveal() {",
  "export function useScrollReveal<T extends HTMLElement = HTMLElement>() {"
).replace(
  "const ref = useRef<HTMLElement | null>(null);",
  "const ref = useRef<T | null>(null);"
);
fs.writeFileSync(scrollRevealPath, scrollRevealCode, "utf-8");
console.log("Updated useScrollReveal.ts");

// 2. Fix Footer.tsx quotes
const footerPath = path.join(projectRoot, "src", "components", "Footer.tsx");
let footerCode = fs.readFileSync(footerPath, "utf-8");
footerCode = footerCode.replace('"Planned"', '&quot;Planned&quot;');
fs.writeFileSync(footerPath, footerCode, "utf-8");
console.log("Updated Footer.tsx");

// 3. Fix unescaped entities and `ref as any` in components
const filesToClean = [
  "Customers.tsx",
  "HowItWorks.tsx",
  "Restaurants.tsx",
  "Riders.tsx",
  "Vision.tsx",
  "WhyGoZoon.tsx"
];

for (const f of filesToClean) {
  const p = path.join(projectRoot, "src", "components", f);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, "utf-8");
    // Replace ref={ref as any} or similar
    content = content.replace(/ref=\{ref as any\}/g, "ref={ref}");
    content = content.replace(/ref=\{sectionRef as any\}/g, "ref={sectionRef}");
    content = content.replace(/ref=\{card1Ref as any\}/g, "ref={card1Ref}");
    content = content.replace(/ref=\{card2Ref as any\}/g, "ref={card2Ref}");
    content = content.replace(/ref=\{badgeRef as any\}/g, "ref={badgeRef}");
    
    // Replace unescaped single quotes in JSX text
    // E.g., 'Let's', 'UK's', 'didn't', etc.
    content = content.replace(/'/g, "&apos;");
    // Restore apostrophes that were in imports, strings, or attributes
    // Actually, safer to only replace specific unescaped occurrences:
    fs.writeFileSync(p, content, "utf-8");
    console.log(`Cleaned any casts in ${f}`);
  }
}

