import { afterEach, describe, expect, it, vi } from "vitest";
import { FIGURES } from "@/data/figures";
import { isFreeLicense, plainText, resolvePortraits } from "@/lib/server/portraits";

describe("portrait licenses", () => {
  it("accepts public domain and Creative Commons Attribution", () => {
    for (const l of ["Public domain", "PD-USGov", "CC0", "CC BY 4.0", "CC BY-SA 3.0", "OGL 3", "GODL-India"]) expect(isFreeLicense(l), l).toBe(true);
  });
  it("rejects non-commercial, no-derivatives and unknown licenses", () => {
    for (const l of ["CC BY-NC 2.0", "CC BY-ND 4.0", "CC BY-NC-SA 2.0", "Fair use", "", "All rights reserved"]) expect(isFreeLicense(l), l).toBe(false);
  });
  it("strips HTML from author credits", () => {
    expect(plainText('<a href="x">The White House</a> &amp; staff')).toBe("The White House & staff");
  });
});

describe("portrait lookup", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("follows redirects and keeps only freely licensed photos", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const u = new URL(url);
        const titles = u.searchParams.get("titles")!.split("|");
        if (u.host === "en.wikipedia.org") {
          return new Response(
            JSON.stringify({
              query: {
                redirects: [{ from: "King Charles III", to: "Charles III" }],
                pages: titles.map((t) => ({ title: t === "King Charles III" ? "Charles III" : t, pageimage: t === "Donald Trump" ? "Trump.jpg" : t === "Charles III" ? "Charles.jpg" : t === "Elon Musk" ? "Musk.jpg" : undefined })),
              },
            }),
          );
        }
        return new Response(
          JSON.stringify({
            query: {
              normalized: titles.map((t) => ({ from: t, to: t.replace(/_/g, " ") })),
              pages: [
                { title: "File:Trump.jpg", imageinfo: [{ thumburl: "https://upload.wikimedia.org/t.jpg", descriptionurl: "https://commons.wikimedia.org/wiki/File:Trump.jpg", extmetadata: { LicenseShortName: { value: "Public domain" }, Artist: { value: "<a>The White House</a>" } } }] },
                { title: "File:Charles.jpg", imageinfo: [{ thumburl: "https://upload.wikimedia.org/c.jpg", extmetadata: { LicenseShortName: { value: "OGL 3" }, Artist: { value: "UK Government" } } }] },
                { title: "File:Musk.jpg", imageinfo: [{ thumburl: "https://upload.wikimedia.org/m.jpg", extmetadata: { LicenseShortName: { value: "CC BY-NC 2.0" }, Artist: { value: "Someone" } } }] },
              ],
            },
          }),
        );
      }),
    );
    const out = await resolvePortraits();
    expect(out["donald-trump"]).toMatchObject({ url: "https://upload.wikimedia.org/t.jpg", credit: "The White House", license: "Public domain" });
    expect(out["charles-iii"]?.license).toBe("OGL 3");
    expect(out["elon-musk"]).toBeUndefined();
  });
});

describe("figures directory", () => {
  it("has unique ids and valid dates", () => {
    expect(new Set(FIGURES.map((f) => f.id)).size).toBe(FIGURES.length);
    for (const f of FIGURES) expect(Number.isFinite(Date.parse(f.inOfficeSince)), f.id).toBe(true);
  });
  it("no longer lists Keir Starmer as prime minister", () => {
    const pm = FIGURES.find((f) => f.position === "Prime Minister of the United Kingdom");
    expect(pm?.name).toBe("Andy Burnham");
  });
});
