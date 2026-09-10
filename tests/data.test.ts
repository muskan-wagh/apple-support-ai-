import { describe, expect, it } from "vitest";
import Papa from "papaparse";
import { identifyBrandAuthor } from "../scripts/filterAppleSupport.js";
import { reconstructConversations, type TweetRow } from "../scripts/buildConversations.js";

describe("csv parsing (papaparse, key-free)", () => {
  it("parses TWCS-style header + rows", () => {
    const csv = `tweet_id,author_id,inbound,created_at,text,response_tweet_id,in_response_to_tweet_id\n1,alice,True,2020-01-01,My iPhone wont connect,2,\n2,AppleSupport,False,2020-01-01,Try restarting your router,,1`;
    const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
    expect(parsed.data).toHaveLength(2);
    expect(parsed.meta.fields).toContain("response_tweet_id");
  });
});

describe("apple filtering (evidence-based, no hardcoded assumption)", () => {
  it("identifies top outbound /apple/i author from data", () => {
    const rows = [
      { author_id: "AppleSupport", inbound: "False" },
      { author_id: "AppleSupport", inbound: "False" },
      { author_id: "applefan123", inbound: "True" },
      { author_id: "SomeBrand", inbound: "False" },
    ];
    const { brandAuthorId } = identifyBrandAuthor(rows);
    expect(brandAuthorId).toBe("AppleSupport");
  });

  it("returns null when no apple-like author observed", () => {
    expect(identifyBrandAuthor([{ author_id: "Other", inbound: "False" }]).brandAuthorId).toBeNull();
  });
});

describe("conversation reconstruction (uses real response links)", () => {
  const rows: TweetRow[] = [
    { tweet_id: "1", author_id: "c1", inbound: "True", created_at: "t", text: "wifi broken", response_tweet_id: "2", in_response_to_tweet_id: "" },
    { tweet_id: "2", author_id: "AppleSupport", inbound: "False", created_at: "t", text: "restart router", response_tweet_id: "", in_response_to_tweet_id: "1" },
    { tweet_id: "3", author_id: "c2", inbound: "True", created_at: "t", text: "other brand q", response_tweet_id: "4", in_response_to_tweet_id: "" },
    { tweet_id: "4", author_id: "OtherBrand", inbound: "False", created_at: "t", text: "other reply", response_tweet_id: "", in_response_to_tweet_id: "3" },
  ];

  it("pairs customer -> AppleSupport via response_tweet_id only", () => {
    const convos = reconstructConversations(rows, "AppleSupport");
    expect(convos).toHaveLength(1);
    expect(convos[0].customerMessage).toBe("wifi broken");
    expect(convos[0].supportResponse).toBe("restart router");
  });

  it("does not randomly pair", () => {
    const convos = reconstructConversations(rows, "AppleSupport");
    expect(convos.every((c) => c.supportTweetId === "2")).toBe(true);
  });
});
