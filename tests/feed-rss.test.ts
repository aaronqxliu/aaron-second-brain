import { describe, it, expect, vi, afterEach } from "vitest";
import { searchNews } from "@/lib/search";
import { FEED_CONFIG } from "@/lib/config";

/** Nature, Science and bioRxiv all serve RSS 1.0/RDF rather than RSS 2.0. */
const RDF_FEED = `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns="http://purl.org/rss/1.0/">
  <channel rdf:about="http://feeds.nature.com/nature/rss/current">
    <title>Nature</title>
    <items>
      <rdf:Seq><rdf:li rdf:resource="https://www.nature.com/articles/a"/></rdf:Seq>
    </items>
  </channel>
  <item rdf:about="https://www.nature.com/articles/a">
    <title><![CDATA[Protein folding, solved again]]></title>
    <link>https://www.nature.com/articles/a</link>
    <content:encoded><![CDATA[<p>Nature, Published online: 21 August 2026</p>A structural biology result.]]></content:encoded>
    <dc:date>2026-08-21</dc:date>
  </item>
</rdf:RDF>`;

const RSS2_FEED = `<rss version="2.0"><channel>
  <item>
    <title>A story</title>
    <link>https://example.com/story</link>
    <comments>https://news.ycombinator.com/item?id=1</comments>
    <description>Body text</description>
    <pubDate>Fri, 21 Aug 2026 10:00:00 GMT</pubDate>
  </item>
</channel></rss>`;

const ATOM_FEED = `<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>An entry</title>
    <link href="https://example.org/entry" rel="alternate"/>
    <summary>Entry summary</summary>
    <published>2026-08-20T12:00:00Z</published>
  </entry>
</feed>`;

function mockFeed(xml: string) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(xml, { status: 200 })));
}

afterEach(() => vi.unstubAllGlobals());

describe("RSS feed parsing", () => {
  it("parses RSS 1.0/RDF items, which carry dc:date and content:encoded", async () => {
    mockFeed(RDF_FEED);
    const { results } = await searchNews([], [], [{ url: "https://www.nature.com/nature.rss", label: "Nature" }]);

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Protein folding, solved again");
    expect(results[0].url).toBe("https://www.nature.com/articles/a");
    expect(results[0].description).toContain("structural biology result");
    expect(results[0].page_age).toBe(new Date("2026-08-21").toISOString());
  });

  it("does not mistake the RDF <items> table of contents for an entry", async () => {
    mockFeed(RDF_FEED);
    const { results } = await searchNews([], [], [{ url: "https://www.nature.com/nature.rss", label: "Nature" }]);
    expect(results.every(r => r.url.startsWith("https://www.nature.com/articles/"))).toBe(true);
  });

  it("still parses RSS 2.0 and prefers <comments> over <link>", async () => {
    mockFeed(RSS2_FEED);
    const { results } = await searchNews([], [], [{ url: "https://hnrss.org/frontpage", label: "HN" }]);

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("A story");
    expect(results[0].url).toBe("https://news.ycombinator.com/item?id=1");
  });

  it("still parses Atom entries", async () => {
    mockFeed(ATOM_FEED);
    const { results } = await searchNews([], [], [{ url: "https://example.org/atom", label: "Atom" }]);

    expect(results).toHaveLength(1);
    expect(results[0].url).toBe("https://example.org/entry");
    expect(results[0].description).toBe("Entry summary");
  });

  it("caps how many items one feed contributes", async () => {
    const many = Array.from({ length: FEED_CONFIG.maxItemsPerFeed + 20 }, (_, i) =>
      `<item><title>Post ${i}</title><link>https://example.com/${i}</link></item>`
    ).join("");
    mockFeed(`<rss version="2.0"><channel>${many}</channel></rss>`);

    const { results } = await searchNews([], [], [{ url: "https://example.com/feed", label: "Archive" }]);
    expect(results).toHaveLength(FEED_CONFIG.maxItemsPerFeed);
  });
});
