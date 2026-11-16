import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "vitest";

const stylesheet = readFileSync(
  new URL("../src/app/globals.css", import.meta.url),
  "utf8",
);

function getRuleBlocks(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [
    ...stylesheet.matchAll(
      new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, "g"),
    ),
  ].map((match) => match[1]);
}

describe("intake design system", () => {
  it("uses the requested palette", () => {
    const root = getRuleBlocks(":root")[0];
    assert.ok(root, "expected global design tokens");

    for (const [token, color] of Object.entries({
      "--aqua": "#f8e9a1",
      "--rose": "#f76c6c",
      "--accent": "#a8d0e6",
      "--brand": "#374785",
      "--brand-dark": "#24305e",
    })) {
      assert.match(root, new RegExp(`${token}:\\s*${color};`, "i"));
    }
  });

  it("keeps comfortable page and panel padding on desktop and mobile", () => {
    const shellRules = getRuleBlocks(".intake-shell");
    const panelRules = getRuleBlocks(".intake-panel");

    assert.ok(
      shellRules.some((rule) =>
        /padding:\s*28px clamp\(24px, 4vw, 48px\) 48px !important;/.test(rule),
      ),
      "expected page-level intake gutters",
    );
    assert.ok(
      panelRules.some((rule) => /padding:\s*28px !important;/.test(rule)),
      "expected desktop panel padding",
    );
    assert.ok(
      shellRules.some((rule) => /padding-inline:\s*20px !important;/.test(rule)),
      "expected mobile page gutters",
    );
    assert.ok(
      panelRules.some((rule) => /padding:\s*20px !important;/.test(rule)),
      "expected mobile panel padding",
    );
  });

  it("keeps horizontal padding on the intake process steps", () => {
    const processStepRules = getRuleBlocks(".intake-process > span");

    assert.ok(
      processStepRules.some((rule) => /padding:\s*7px 12px !important;/.test(rule)),
      "expected horizontal padding around each process label",
    );
  });
});
