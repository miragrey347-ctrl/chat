import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { query, maxResults = 5 } = await request.json();
    if (!query?.trim()) {
      return NextResponse.json({ error: "Query required" }, { status: 400 });
    }

    // Try Serper (Google search) first
    const serperKey = process.env.SERPER_API_KEY;
    if (serperKey) {
      const results = await serperSearch(query, serperKey, maxResults);
      if (results.length > 0) return NextResponse.json({ query, results });
    }

    // Try Brave Search
    const braveKey = process.env.BRAVE_SEARCH_API_KEY;
    if (braveKey) {
      const results = await braveSearch(query, braveKey, maxResults);
      if (results.length > 0) return NextResponse.json({ query, results });
    }

    // No API key configured
    return NextResponse.json({
      query,
      results: [],
      error: "未配置搜索 API Key。请在 Vercel 环境变量中添加 SERPER_API_KEY 或 BRAVE_SEARCH_API_KEY。",
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ query: "", results: [], error: "搜索失败" });
  }
}

async function serperSearch(query: string, apiKey: string, max: number) {
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({ q: query, num: max, gl: "cn", hl: "zh-cn" }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.organic || []).slice(0, max).map((r: { title: string; snippet: string; link: string }) => ({
      title: r.title || "",
      snippet: r.snippet || "",
      url: r.link || "",
    }));
  } catch { return []; }
}

async function braveSearch(query: string, apiKey: string, max: number) {
  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${max}`;
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
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
