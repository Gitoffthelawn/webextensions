/* exported FeedParser */

// Shared by the background script (feed verification) and preview.html.
const FeedParser = (() => {
  function safeUrl(u, base) {
    try {
      const x = new URL(u, base);
      return x.protocol === "http:" || x.protocol === "https:" ? x.href : null;
    } catch (e) {
      return null;
    }
  }

  // feed content is untrusted: never inject it as HTML, only ever as text
  function htmlToText(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
  }

  function truncate(str, max) {
    return str.length > max ? str.slice(0, max).trimEnd() + " …" : str;
  }

  function childEls(parent, name) {
    return Array.from(parent.children).filter(
      (c) => c.localName.toLowerCase() === name,
    );
  }

  function childText(parent, names) {
    for (const name of names) {
      for (const el of childEls(parent, name)) {
        const t = (el.textContent || "").replace(/\s+/g, " ").trim();
        if (t !== "") {
          return t;
        }
      }
    }
    return "";
  }

  function atomLink(parent) {
    const links = childEls(parent, "link");
    const alt =
      links.find(
        (l) => (l.getAttribute("rel") || "alternate") === "alternate",
      ) || links[0];
    return alt ? (alt.getAttribute("href") || "").trim() : "";
  }

  function parseTimestamp(str) {
    if (typeof str !== "string" || str === "") {
      return null;
    }
    const t = Date.parse(str);
    return isNaN(t) ? null : t;
  }

  // honour the charset from the Content-Type header or the XML declaration
  function decodeBytes(bytes, ctype) {
    let label = "utf-8";
    const m = /charset\s*=\s*["']?([\w.:-]+)/i.exec(ctype || "");
    if (m) {
      label = m[1];
    } else {
      const head = new TextDecoder("latin1").decode(bytes.subarray(0, 200));
      const x = /<\?xml[^>]*encoding\s*=\s*["']([\w.:-]+)["']/i.exec(head);
      if (x) {
        label = x[1];
      }
    }
    try {
      return new TextDecoder(label).decode(bytes);
    } catch (e) {
      return new TextDecoder("utf-8").decode(bytes);
    }
  }

  // Looks at the first bytes of a response body.
  //  "xml" / "json" -> definitely looks like a feed
  //  "no"           -> definitely not a feed (HTML, or XML with another root)
  //  "maybe"        -> undecided (e.g. a JSON object, needs a full parse)
  function sniff(head) {
    const t = head.replace(/^\uFEFF/, "").trimStart();
    if (t === "") {
      return "maybe";
    }
    if (/^<(?:!doctype\s+html|html)[\s>]/i.test(t)) {
      return "no";
    }
    if (t[0] === "{") {
      return /"version"\s*:\s*"https?:\/\/jsonfeed\.org\/version\//i.test(t)
        ? "json"
        : "maybe";
    }
    if (t[0] === "<") {
      const m = /<(?![?!])([A-Za-z_][\w:.-]*)/.exec(t);
      if (!m) {
        return "maybe";
      }
      const root = m[1].toLowerCase();
      if (
        root === "rss" ||
        root === "feed" ||
        root === "rdf" ||
        root.endsWith(":rss") ||
        root.endsWith(":feed") ||
        root.endsWith(":rdf")
      ) {
        return "xml";
      }
      return "no";
    }
    return "maybe";
  }

  function parseXmlFeed(text) {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.getElementsByTagName("parsererror").length > 0) {
      throw new Error("The response is not well-formed XML.");
    }
    const root = doc.documentElement;
    const rootName = root.localName.toLowerCase();

    let meta;
    let entries;
    let atom = false;

    if (rootName === "rss" || rootName === "rdf") {
      const channel = childEls(root, "channel")[0];
      if (!channel) {
        throw new Error("RSS feed without a <channel> element.");
      }
      meta = {
        title: childText(channel, ["title"]),
        link: childText(channel, ["link"]),
        description: childText(channel, ["description"]),
        updated: childText(channel, ["lastbuilddate", "pubdate", "date"]),
      };
      entries =
        rootName === "rss" ? childEls(channel, "item") : childEls(root, "item");
    } else if (rootName === "feed") {
      atom = true;
      meta = {
        title: childText(root, ["title"]),
        link: atomLink(root),
        description: childText(root, ["subtitle", "tagline"]),
        updated: childText(root, ["updated"]),
      };
      entries = childEls(root, "entry");
    } else {
      throw new Error(
        "Unsupported XML document type: <" + root.localName + ">",
      );
    }

    const items = entries.map((el) => {
      let link = atom ? atomLink(el) : childText(el, ["link"]);
      if (!link && !atom) {
        const guid = childText(el, ["guid"]);
        if (/^https?:\/\//i.test(guid)) {
          link = guid;
        }
      }
      let author = childText(el, ["creator"]);
      if (!author) {
        const a = childEls(el, "author")[0];
        if (a) {
          author = childText(a, ["name"]) || (a.textContent || "").trim();
        }
      }
      let enclosures;
      if (atom) {
        enclosures = childEls(el, "link").filter(
          (l) => l.getAttribute("rel") === "enclosure",
        );
      } else {
        enclosures = childEls(el, "enclosure");
      }
      enclosures = enclosures
        .map((e) => ({
          url: (e.getAttribute(atom ? "href" : "url") || "").trim(),
          type: (e.getAttribute("type") || "").trim(),
          length: parseInt(e.getAttribute("length"), 10) || 0,
        }))
        .filter((e) => e.url !== "");
      return {
        title: childText(el, ["title"]),
        link,
        date: childText(el, ["pubdate", "date", "published", "updated"]),
        author,
        summary: childText(el, [
          "description",
          "summary",
          "encoded",
          "content",
        ]),
        enclosures,
      };
    });

    return { type: "xml", meta, items };
  }

  function parseJsonFeed(text) {
    const obj = JSON.parse(text);
    if (!obj || typeof obj !== "object" || !Array.isArray(obj.items)) {
      throw new Error("The JSON document is not a JSON Feed (no items array).");
    }
    const str = (v) => (typeof v === "string" ? v : "");
    const items = obj.items.map((it) => {
      const authors = Array.isArray(it.authors)
        ? it.authors
        : it.author
          ? [it.author]
          : [];
      const attachments = Array.isArray(it.attachments) ? it.attachments : [];
      return {
        title: str(it.title),
        link: str(it.url) || str(it.external_url),
        date: str(it.date_published) || str(it.date_modified),
        author: authors
          .map((a) => str(a && a.name))
          .filter(Boolean)
          .join(", "),
        summary:
          str(it.summary) || str(it.content_text) || str(it.content_html),
        enclosures: attachments
          .map((a) => ({
            url: str(a && a.url),
            type: str(a && a.mime_type),
            length: Number(a && a.size_in_bytes) || 0,
          }))
          .filter((e) => e.url !== ""),
      };
    });
    return {
      type: "json",
      meta: {
        title: str(obj.title),
        link: str(obj.home_page_url),
        description: str(obj.description),
        updated: "",
      },
      items,
    };
  }

  function parseFeed(text) {
    const trimmed = text.replace(/^\uFEFF/, "").trim();
    return trimmed.startsWith("{")
      ? parseJsonFeed(trimmed)
      : parseXmlFeed(trimmed);
  }

  // newest timestamp (ms) of the feed's own date and all item dates, or null
  function latestTimestamp(feed) {
    let latest = parseTimestamp(feed.meta.updated);
    for (const it of feed.items) {
      const t = parseTimestamp(it.date);
      if (t !== null && (latest === null || t > latest)) {
        latest = t;
      }
    }
    return latest;
  }

  return {
    safeUrl,
    htmlToText,
    truncate,
    parseTimestamp,
    decodeBytes,
    sniff,
    parseFeed,
    latestTimestamp,
  };
})();
