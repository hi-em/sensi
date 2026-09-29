// Run: node --test web/src/galaxy/tooltip.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { nodeLabelHtml, escapeHtml } from "./tooltip.js";

const PAYLOAD = '<img src=x onerror="window.__x=1">';

test("room names are escaped in every tooltip kind", () => {
  for (const kind of ["sense", "room", "score", "lever"]) {
    const html = nodeLabelHtml({ kind, label: PAYLOAD, rtype: PAYLOAD, fail: PAYLOAD, degree: PAYLOAD });
    assert.ok(!html.includes("<img"), kind);
    assert.ok(html.includes("&lt;img"), kind);
    assert.ok(!html.includes('"window'), kind);
  }
});

test("escapeHtml covers & < > \" '", () => {
  assert.equal(escapeHtml(`&<>"'`), "&amp;&lt;&gt;&quot;&#39;");
  assert.equal(escapeHtml(undefined), "");
});
