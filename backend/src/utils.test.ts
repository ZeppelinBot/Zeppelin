import test from "ava";
import * as ioTs from "io-ts";
import { convertDelayStringToMS, convertMSToDelayString, getUrlsInString, tAllowedMentions } from "./utils";
import { ErisAllowedMentionFormat } from "./utils/erisAllowedMentionsToDjsMentionOptions";

type AssertEquals<TActual, TExpected> = TActual extends TExpected ? true : false;

test("getUrlsInString(): detects full links", t => {
  const urls = getUrlsInString("foo https://google.com/ bar");
  t.is(urls.length, 1);
  t.is(urls[0].hostname, "google.com");
});

test("getUrlsInString(): detects partial links", t => {
  const urls = getUrlsInString("foo google.com bar");
  t.is(urls.length, 1);
  t.is(urls[0].hostname, "google.com");
});

test("getUrlsInString(): detects subdomains", t => {
  const urls = getUrlsInString("foo photos.google.com bar");
  t.is(urls.length, 1);
  t.is(urls[0].hostname, "photos.google.com");
});

test("delay strings: basic support", t => {
  const delayString = "2w4d7h32m17s";
  const expected = 1_582_337_000;
  t.is(convertDelayStringToMS(delayString), expected);
});

test("delay strings: default unit (minutes)", t => {
  t.is(convertDelayStringToMS("10"), 10 * 60 * 1000);
});

test("delay strings: custom default unit", t => {
  t.is(convertDelayStringToMS("10", "s"), 10 * 1000);
});

test("delay strings: reverse conversion", t => {
  const ms = 1_582_337_020;
  const expected = "2w4d7h32m17s20x";
  t.is(convertMSToDelayString(ms), expected);
});

test("delay strings: reverse conversion (conservative)", t => {
  const ms = 1_209_600_000;
  const expected = "2w";
  t.is(convertMSToDelayString(ms), expected);
});

test("tAllowedMentions matches Eris's AllowedMentions", t => {
  type TAllowedMentions = ioTs.TypeOf<typeof tAllowedMentions>;
  const typeTest: AssertEquals<TAllowedMentions, ErisAllowedMentionFormat> = true;
  t.pass();
});
