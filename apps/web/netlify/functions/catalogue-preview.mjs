const API_ORIGIN = (process.env.SELLORA_API_URL || "https://sellora-api.onrender.com").replace(/\/$/, "").replace(/\/api$/, "");

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const absoluteUrl = (value, base) => {
  if (!value) return "";
  try { return new URL(value, base).href; } catch { return ""; }
};

export default async (request) => {
  const incoming = new URL(request.url);
  const slug = (incoming.searchParams.get("slug") || "").split("/")[0].trim();
  if (!slug || !/^[a-zA-Z0-9_-]+$/.test(slug)) return new Response("Catalogue not found", { status: 404 });

  let catalogue;
  try {
    const response = await fetch(`${API_ORIGIN}/api/public/catalogues/${encodeURIComponent(slug)}`, { headers: { accept: "application/json" } });
    if (!response.ok) return new Response("Catalogue not found", { status: response.status === 404 ? 404 : 502 });
    catalogue = await response.json();
  } catch {
    return new Response("Catalogue preview is temporarily unavailable", { status: 502 });
  }

  const canonical = `${incoming.origin}/c/${encodeURIComponent(slug)}`;
  const title = `${catalogue.business?.name || catalogue.title || "Product catalogue"} | Sellora`;
  const description = (catalogue.description || `Explore products from ${catalogue.business?.name || "this business"} on Sellora. View product details and contact the supplier directly.`).replace(/\s+/g, " ").slice(0, 250);
  const image = absoluteUrl(catalogue.products?.find((product) => product.imageUrl)?.imageUrl || catalogue.business?.logoUrl, incoming.origin);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${escapeHtml(canonical)}"><meta property="og:type" content="website"><meta property="og:site_name" content="Sellora"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}">${image ? `<meta property="og:image" content="${escapeHtml(image)}"><meta property="og:image:alt" content="${escapeHtml(catalogue.business?.name || "Catalogue product")}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${escapeHtml(image)}">` : '<meta name="twitter:card" content="summary">'}<meta http-equiv="refresh" content="0;url=${escapeHtml(canonical)}"><script>window.location.replace(${JSON.stringify(canonical)})</script></head><body><p>Opening ${escapeHtml(catalogue.business?.name || "catalogue")}… <a href="${escapeHtml(canonical)}">Continue</a></p></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60, s-maxage=300" } });
};
