import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { query, maxResults = 5 } = await request.json();
    if (!query?.trim()) {
      return NextResponse.json({ error: "Query required" }, { status: 400 });
    }

    // Try Brave Search API if key is available
    const braveKey = process.env.BRAVE_SEARCH_API_KEY;
    if (braveKey) {
      const results = await braveSearch(query, braveKey, maxResults);
      if (results.length > 0) return NextResponse.json({ query, results });
    }

    // Fallback: DuckDuckGo lite
    const results = await duckDuckGoSearch(query, maxResults);
    return NextResponse.json({ query, results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ query: "", results: [] });
  }
}

async function braveSearch(query: string, apiKey: string, max: number) {
  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${max}`;
    const res = await fetch(url, {
      headers: { "Accept": "application/json", "Accept-Encoding": "gzip", "X-Subscription-Token": apiKey },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.web?.results || []).slice(0, max).map((r: { title: string; description: string; url: string }) => ({
      title: r.title || "",
      snippet: r.description || "",
      url: r.url || "",
    }));
  } catch { return []; }
}

async function duckDuckGoSearch(query: string, max: number) {
  try {
    // Use DuckDuckGo lite which is less likely to block
    const res = await fetch(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html",
      },
    });
    if (!res.ok) return [];
    const html = await res.text();

    const results: { title: string; snippet: string; url: string }[] = [];

    // Parse lite results - they come in table rows with class="result-link" and class="result-snippet"
    const linkRegex = /<a[^>]*class="result-link"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
    const snippetRegex = /<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/g;

    const links: { url: string; title: string }[] = [];
    const snippets: string[] = [];

    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      links.push({
        url: match[1].trim(),
        title: match[2].replace(/<[^>]*>/g, "").trim(),
      });
    }
    while ((match = snippetRegex.exec(html)) !== null) {
      snippets.push(match[1].replace(/<[^>]*>/g, "").trim());
    }

    for (let i = 0; i < Math.min(links.length, snippets.length, max); i++) {
      if (links[i].title && snippets[i]) {
        results.push({ title: links[i].title, snippet: snippets[i], url: links[i].url });
      }
    }

    // If lite parsing failed, try the HTML version
    if (results.length === 0) {
      return await duckDuckGoHtmlSearch(query, max);
    }

    return results;
  } catch { return []; }
}

async function duckDuckGoHtmlSearch(query: string, max: number) {
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });
    if (!res.ok) return [];
    const html = await res.text();

    const results: { title: string; snippet: string; url: string }[] = [];
    // Match result blocks
    const blockRegex = /<h2[^>]*class="result__title"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    while ((match = blockRegex.exec(html)) !== null && results.length < max) {
      const url = decodeURIComponent(match[1].replace(/.*uddg=([^&]*).*/, "$1"));
      const title = match[2].replace(/<[^>]*>/g, "").trim();
      const snippet = match[3].replace(/<[^>]*>/g, "").trim();
      if (title && snippet) results.push({ title, snippet, url });
    }
    return results;
  } catch { return []; }
}
