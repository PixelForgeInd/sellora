const API_ORIGIN = (process.env.SELLORA_API_URL || "https://sellora-api.onrender.com").replace(/\/$/, "").replace(/\/api$/, "");

const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );

const absoluteUrl = (value, base) => {
  if (!value) return "";
  try {
    return new URL(value, base).href;
  } catch {
    return "";
  }
};

export default async (request) => {
  const incoming = new URL(request.url);
  const slug = (incoming.searchParams.get("slug") || "").split("/")[0].trim();
  if (!slug || !/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return new Response("Catalogue not found", { status: 404 });
  }

  let catalogue;
  try {
    const response = await fetch(
      `${API_ORIGIN}/api/public/catalogues/${encodeURIComponent(slug)}`,
      { headers: { accept: "application/json" } },
    );
    if (response.status === 404) {
      return new Response("Catalogue not found", { status: 404 });
    }
    if (!response.ok) {
      return new Response("Catalogue is temporarily unavailable", { status: 502 });
    }
    catalogue = await response.json();
  } catch {
    return new Response("Catalogue is temporarily unavailable", { status: 502 });
  }

  // Serve the SPA at /c/:slug. Redirecting back to the same URL re-invokes
  // the /c/* rewrite and creates a redirect loop instead of loading the app.
  let html;
  try {
    const appResponse = await fetch(new URL("/index.html", incoming.origin));
    if (!appResponse.ok) throw new Error("Could not load the web app shell");
    html = await appResponse.text();
  } catch {
    return new Response("Catalogue page is temporarily unavailable", { status: 502 });
  }

  const canonical = `${incoming.origin}/c/${encodeURIComponent(slug)}`;
  const businessName = catalogue.business?.name || catalogue.title || "Product catalogue";
  const title = `${businessName} | Sellora`;
  const description = (
    catalogue.description ||
    `Explore products from ${businessName} on Sellora. View product details and contact the supplier directly.`
  ).replace(/\s+/g, " ").slice(0, 250);
  const image = absoluteUrl(
    catalogue.products?.find((product) => product.imageUrl)?.imageUrl ||
      catalogue.business?.logoUrl,
    incoming.origin,
  );

  const metadata = [
    `<meta name="description" content="${escapeHtml(description)}">`,
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Sellora">',
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(canonical)}">`,
    image
      ? `<meta property="og:image" content="${escapeHtml(image)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${escapeHtml(image)}">`
      : '<meta name="twitter:card" content="summary">',
  ].join("");

  html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(/<head([^>]*)>/i, `<head$1>${metadata}`);

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=60, s-maxage=300",
    },
  });
};
