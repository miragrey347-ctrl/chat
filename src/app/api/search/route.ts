import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { query, maxResults = 5 } = await request.json();

    if (!query || !query.trim()) {
      return NextResponse.json({ error: "Query required" }, { status: 400 });
    }

    // Use DuckDuckGo HTML search and parse results
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ChatApp/1.0)",
      },
    });

    if (!res.ok) {
      throw new Error(`Search failed: ${res.status}`);
    }

    const html = await res.text();

    // Parse search results from HTML
    const results: { title: string; snippet: string; url: string }[] = [];
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let match;

    while ((match = resultRegex.exec(html)) !== null && results.length < maxResults) {
      const url = decodeURIComponent(
        match[1].replace(/.*uddg=([^&]*).*/, "$1")
      );
      const title = match[2].replace(/<[^>]*>/g, "").trim();
      const snippet = match[3].replace(/<[^>]*>/g, "").trim();

      if (title && snippet && url) {
        results.push({ title, snippet, url });
      }
    }

    // Fallback: try simpler pattern
    if (results.length === 0) {
      const simpleRegex = /<a[^>]*class="result__url"[^>]*[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
      while ((match = simpleRegex.exec(html)) !== null && results.length < maxResults) {
        const url = match[1].replace(/<[^>]*>/g, "").trim();
        const snippet = match[2].replace(/<[^>]*>/g, "").trim();
        if (snippet) {
          results.push({ title: url, snippet, url: `https://${url}` });
        }
      }
    }

    return NextResponse.json({ query, results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "搜索失败" }, { status: 500 });
  }
}
