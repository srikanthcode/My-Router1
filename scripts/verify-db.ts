import { getDb, closeDb, models, providers, plans, creditPackages, astraCampaigns, modelProviders, modelPricing } from "@pro/database";

const db = await getDb();
const m = await db.select().from(models);
const p = await db.select().from(plans);
const pk = await db.select().from(creditPackages);
const c = await db.select().from(astraCampaigns);
const links = await db.select().from(modelProviders);
const pricing = await db.select().from(modelPricing);

console.log(`models: ${m.length}`);
console.log(`free models: ${m.filter((x) => x.isFree).length}`);
console.log(`plans: ${p.map((x) => x.slug).join(", ")}`);
console.log(`packages: ${pk.map((x) => `${x.name} ₹${x.pricePaise / 100}+₹${x.bonusPaise / 100}`).join(" | ")}`);
console.log(`campaign: ${c.map((x) => `${x.name} ₹${x.promoPricePaise / 100} (${x.discountPercent}% off ₹${x.originalPricePaise / 100})`).join("")}`);
console.log(`model-provider links: ${links.length}`);
console.log(`pricing rows: ${pricing.length}`);
console.log(`sample models: ${m.slice(0, 5).map((x) => `${x.slug}${x.isFree ? " [FREE]" : ""}`).join(", ")}`);
await closeDb();