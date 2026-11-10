
import "server-only";

import * as cheerio from "cheerio";
import type { gmail_v1 } from "googleapis";

function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf-8");
}

function extractParts(
  part: gmail_v1.Schema$MessagePart | undefined,
  mimeType: string
): string[] {
  if (!part) return [];

  const results: string[] = [];

  if (part.mimeType === mimeType && part.body?.data) {
    results.push(decodeBase64Url(part.body.data));
  }

  for (const child of part.parts ?? []) {
    results.push(...extractParts(child, mimeType));
  }

  return results;
}

function htmlToText(html: string): string {
  const $ = cheerio.load(html);

  $("script, style, noscript, svg, head").remove();

  $("br").replaceWith("\n");
  $("td, th").append(" ");
  $("tr, p, div, li, h1, h2, h3").append("\n");

  return $("body")
    .text()
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractGmailText(
  payload: gmail_v1.Schema$MessagePart | undefined
): string {
  const plainText = extractParts(payload, "text/plain");
  const htmlParts = extractParts(payload, "text/html");

  const plain = plainText.join("\n\n").trim();

  // Some airlines send HTML inside the text/plain part.
  if (/^\s*(<!doctype html|<html\b)/i.test(plain)) {
    return htmlToText(plain);
  }

  if (plain) {
    return plain;
  }

  return htmlToText(htmlParts.join("\n\n"));
}
