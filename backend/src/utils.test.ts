import { getUrlsInString } from "./utils";

import test from "ava";

test("Detects full links", t => {
  const urls = getUrlsInString("foo https://google.com/ bar");
  t.is(urls.length, 1);
  t.is(urls[0].hostname, "google.com");
});

test("Detects partial links", t => {
  const urls = getUrlsInString("foo google.com bar");
  t.is(urls.length, 1);
  t.is(urls[0].hostname, "google.com");
});

test("Detects subdomains", t => {
  const urls = getUrlsInString("foo photos.google.com bar");
  t.is(urls.length, 1);
  t.is(urls[0].hostname, "photos.google.com");
});
