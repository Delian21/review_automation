#!/usr/bin/env node
// Two-owner row-level-security and compliance proof for ReviewLoop Phases 2-3.
// Reads keys from .env.local, never hardcodes them. Run: node scripts/rls-check.mjs

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const text = readFileSync(resolve(root, file), "utf8");
      for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        const [, key, raw] = m;
        if (key in process.env) continue;
        const value = raw.replace(/^["']|["']$/g, "");
        if (value) process.env[key] = value;
      }
    } catch {
      /* file may not exist */
    }
  }
}
loadEnv();

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_ || !ANON || !SERVICE) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(2);
}

const rest = `${URL_}/rest/v1`;
const authAdmin = `${URL_}/auth/v1/admin/users`;
// The export checks exercise the real Next.js route, so the dev server must be
// running. APP_URL overrides; the default matches this project's dev port.
const APP_URL = process.env.APP_URL || "http://localhost:3100";

const results = [];
function record(name, expected, pass, detail) {
  results.push({ name, expected, pass: Boolean(pass), detail });
}

async function req({ url, method = "GET", token, body, headers = {}, prefer, apiKey }) {
  const h = { apikey: apiKey ?? ANON, "Content-Type": "application/json", ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  if (prefer) h.Prefer = prefer;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: h,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    return { status: 0, rows: null, error: String(e) };
  }
  let rows = null;
  const text = await res.text();
  if (text) {
    try {
      rows = JSON.parse(text);
    } catch {
      rows = text;
    }
  }
  return { status: res.status, rows };
}

// signUp returns a session only when email confirmation is OFF.
async function signUp(tag) {
  const email = `rls-check-${tag}-${Date.now()}@example.com`;
  const res = await req({
    url: `${URL_}/auth/v1/signup`,
    method: "POST",
    body: { email, password: `Rls!${Math.random().toString(36).slice(2)}Xx1` },
  });
  // GoTrue returns the session at the top level (access_token, user, ...); some
  // responses nest it under `session`. Accept either shape.
  const session = res.rows?.session ?? res.rows;
  if (!session?.access_token || !res.rows?.user?.id) {
    const code = res.rows?.error_code;
    let hint = `Response: ${JSON.stringify(res.rows)}`;
    if (code === "email_provider_disabled") {
      hint =
        `The Email provider has signups OFF. Turn "Enable sign ups" ON in ` +
        `Authentication -> Sign In / Providers -> Email (and keep "Confirm email" OFF). ` +
        `Response: ${JSON.stringify(res.rows)}`;
    } else if (res.status === 400 && !session) {
      hint =
        `No session returned — email confirmation is probably ON. Turn it OFF in ` +
        `Authentication -> Sign In / Providers -> Email. Response: ${JSON.stringify(res.rows)}`;
    }
    throw new Error(`signUp failed for ${tag} (status ${res.status}). ${hint}`);
  }
  return { id: res.rows.user.id, jwt: session.access_token, email };
}

const table = (name, query = "") => `${rest}/${name}${query}`;

async function readCount(token, name, id) {
  const r = await req({ url: table(name, `?id=eq.${id}&select=id`), token });
  return { status: r.status, count: Array.isArray(r.rows) ? r.rows.length : -1 };
}

async function updateCount(token, name, id, patch) {
  const r = await req({
    url: table(name, `?id=eq.${id}`),
    method: "PATCH",
    token,
    prefer: "return=representation",
    body: patch,
  });
  return { status: r.status, count: Array.isArray(r.rows) ? r.rows.length : -1 };
}

async function deleteCount(token, name, id) {
  const r = await req({
    url: table(name, `?id=eq.${id}`),
    method: "DELETE",
    token,
    prefer: "return=representation",
  });
  return { status: r.status, count: Array.isArray(r.rows) ? r.rows.length : -1 };
}

// Fetches the real /api/customers/export as the given owner. status 0 means
// the dev server was unreachable — the calling check must FAIL, never skip.
async function exportCsv(jwt) {
  try {
    const res = await fetch(`${APP_URL}/api/customers/export`, {
      headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
      signal: AbortSignal.timeout(10000),
    });
    return {
      status: res.status,
      text: await res.text(),
      disposition: res.headers.get("content-disposition") ?? "",
    };
  } catch (error) {
    return { status: 0, text: "", disposition: "", detail: String(error) };
  }
}

let A;
let B;
let fatal = false;
const ids = {};

try {
  A = await signUp("a");
  B = await signUp("b");

  // --- A builds their own data (proves RLS allows the owner, not just blocks everyone) ---
  const biz = await req({
    url: table("businesses"),
    method: "POST",
    token: A.jwt,
    prefer: "return=representation",
    body: {
      owner_id: A.id,
      name: "A Salon",
      google_review_link: "https://g.page/r/example/review",
      message_template: "Hi {customer_name}, thanks for coming in. {review_link}",
    },
  });
  if (biz.status !== 201 || !biz.rows?.[0]?.id) {
    throw new Error(`A business insert failed: ${biz.status} ${JSON.stringify(biz.rows)}`);
  }
  ids.business = biz.rows[0].id;

  const cust = await req({
    url: table("customers"),
    method: "POST",
    token: A.jwt,
    prefer: "return=representation",
    body: { business_id: ids.business, name: "Customer One", email: "c1@example.com" },
  });
  if (cust.status !== 201) {
    throw new Error(`A customer insert failed: ${cust.status} ${JSON.stringify(cust.rows)}`);
  }
  ids.customer = cust.rows[0].id;

  // Phase 3 gives each message test its own customer: the 30-day guard
  // refuses a second request on the same customer, so sharing one customer
  // would mask what each check is actually proving.
  const addCustomer = async (body) => {
    const r = await req({
      url: table("customers"),
      method: "POST",
      token: A.jwt,
      prefer: "return=representation",
      body: { business_id: ids.business, ...body },
    });
    if (r.status !== 201) {
      throw new Error(`A customer insert failed: ${r.status} ${JSON.stringify(r.rows)}`);
    }
    return r.rows[0].id;
  };
  ids.customerFresh = await addCustomer({ name: "Customer Fresh", phone: "+447700900555" });
  ids.customerPrepared = await addCustomer({ name: "Customer Prepared", phone: "+447700900666" });
  ids.customerDenied = await addCustomer({ name: "Customer Denied", phone: "+447700900777" });
  ids.customerOptedOut = await addCustomer({
    name: "Customer Opted Out",
    phone: "+447700900888",
    opted_out: true,
  });

  const msg = await req({
    url: table("messages"),
    method: "POST",
    token: A.jwt,
    prefer: "return=representation",
    body: { customer_id: ids.customer, channel: "email" },
  });
  if (msg.status !== 201) {
    throw new Error(`A message insert failed: ${msg.status} ${JSON.stringify(msg.rows)}`);
  }
  ids.message = msg.rows[0].id;

  const fb = await req({
    url: table("feedback"),
    method: "POST",
    token: A.jwt,
    prefer: "return=representation",
    body: { business_id: ids.business, customer_id: ids.customer, text: "Great visit" },
  });
  if (fb.status !== 201) {
    throw new Error(`A feedback insert failed: ${fb.status} ${JSON.stringify(fb.rows)}`);
  }
  ids.feedback = fb.rows[0].id;

  // --- B must not reach A's rows ---
  const targets = [
    ["business", "businesses", ids.business, { name: "B hacked" }],
    ["customer", "customers", ids.customer, { name: "B hacked" }],
    ["message", "messages", ids.message, { status: "sent" }],
    ["feedback", "feedback", ids.feedback, { text: "B hacked" }],
  ];
  for (const [label, name, id, patch] of targets) {
    const read = await readCount(B.jwt, name, id);
    record(
      `B cannot read A's ${label}`,
      "0 rows or denied",
      read.count === 0 || read.status >= 400,
      `status ${read.status}, rows ${read.count}`,
    );
    const upd = await updateCount(B.jwt, name, id, patch);
    record(
      `B cannot update A's ${label}`,
      "0 rows or denied",
      upd.count === 0 || upd.status >= 400,
      `status ${upd.status}, rows ${upd.count}`,
    );
  }

  // B must not add a customer to A's business.
  const bInsert = await req({
    url: table("customers"),
    method: "POST",
    token: B.jwt,
    prefer: "return=representation",
    body: { business_id: ids.business, name: "Intruder" },
  });
  record(
    "B cannot add a customer to A's business",
    "denied (4xx)",
    bInsert.status >= 400,
    `status ${bInsert.status}`,
  );

  // B must not delete A's business or customer.
  const bDelBiz = await deleteCount(B.jwt, "businesses", ids.business);
  record(
    "B cannot delete A's business",
    "0 rows or denied",
    bDelBiz.count === 0 || bDelBiz.status >= 400,
    `status ${bDelBiz.status}, rows ${bDelBiz.count}`,
  );
  const bDelCust = await deleteCount(B.jwt, "customers", ids.customer);
  record(
    "B cannot delete A's customer",
    "0 rows or denied",
    bDelCust.count === 0 || bDelCust.status >= 400,
    `status ${bDelCust.status}, rows ${bDelCust.count}`,
  );

  // B must not insert a message under A's customer, or feedback under A's
  // business. The target customer has no messages, so the 30-day trigger has
  // nothing to say: a denial here can only have come from row-level security.
  const bMsg = await req({
    url: table("messages"),
    method: "POST",
    token: B.jwt,
    prefer: "return=representation",
    body: { customer_id: ids.customerFresh, channel: "whatsapp", status: "prepared" },
  });
  record(
    "B cannot insert a message under A's customer",
    "denied (4xx)",
    bMsg.status >= 400,
    `status ${bMsg.status}`,
  );
  const bFb = await req({
    url: table("feedback"),
    method: "POST",
    token: B.jwt,
    prefer: "return=representation",
    body: { business_id: ids.business, customer_id: ids.customer, text: "intruder" },
  });
  record(
    "B cannot insert feedback under A's business",
    "denied (4xx)",
    bFb.status >= 400,
    `status ${bFb.status}`,
  );

  // B must not delete A's message (the API grants messages no DELETE at all).
  const bDelMsg = await deleteCount(B.jwt, "messages", ids.message);
  record(
    "B cannot delete A's message",
    "0 rows or denied",
    bDelMsg.count === 0 || bDelMsg.status >= 400,
    `status ${bDelMsg.status}, rows ${bDelMsg.count}`,
  );

  // B must not lift the opt-out on A's customer, and must not list A's customers.
  const bOptOut = await updateCount(B.jwt, "customers", ids.customerOptedOut, { opted_out: false });
  record(
    "B cannot undo opt-out on A's customer",
    "0 rows or denied",
    bOptOut.count === 0 || bOptOut.status >= 400,
    `status ${bOptOut.status}, rows ${bOptOut.count}`,
  );
  const bList = await req({
    url: table("customers", `?business_id=eq.${ids.business}&select=id`),
    token: B.jwt,
  });
  record(
    "B cannot list A's customers",
    "0 rows or denied",
    bList.status >= 400 || (Array.isArray(bList.rows) && bList.rows.length === 0),
    `status ${bList.status}`,
  );

  // --- Phase 3: prepared sends, opt-out, and the 30-day rule ---
  // Enforced by the trigger in 0002_phase3_customers.sql, so they hold for a
  // hand-rolled client too, not only for our own UI.
  const prepared = await req({
    url: table("messages"),
    method: "POST",
    token: A.jwt,
    prefer: "return=representation",
    body: { customer_id: ids.customerPrepared, channel: "whatsapp", status: "prepared" },
  });
  record(
    "A can record a prepared WhatsApp request",
    "created (201)",
    prepared.status === 201,
    `status ${prepared.status}`,
  );

  const secondRequest = await req({
    url: table("messages"),
    method: "POST",
    token: A.jwt,
    body: { customer_id: ids.customerPrepared, channel: "whatsapp", status: "prepared" },
  });
  record(
    "a second request inside 30 days is refused",
    "denied (4xx)",
    secondRequest.status >= 400,
    `status ${secondRequest.status}`,
  );

  const optedOutSend = await req({
    url: table("messages"),
    method: "POST",
    token: A.jwt,
    body: { customer_id: ids.customerOptedOut, channel: "whatsapp", status: "prepared" },
  });
  record(
    "an opted-out customer cannot be messaged",
    "denied (4xx)",
    optedOutSend.status >= 400,
    `status ${optedOutSend.status}`,
  );

  // A failed send is not a request: the owner may try that customer again.
  const failedSend = await req({
    url: table("messages"),
    method: "POST",
    token: A.jwt,
    prefer: "return=representation",
    body: { customer_id: ids.customerDenied, channel: "whatsapp", status: "failed" },
  });
  record(
    "A can record a failed send",
    "created (201)",
    failedSend.status === 201,
    `status ${failedSend.status}`,
  );
  const retryAfterFailure = await req({
    url: table("messages"),
    method: "POST",
    token: A.jwt,
    prefer: "return=representation",
    body: { customer_id: ids.customerDenied, channel: "whatsapp", status: "prepared" },
  });
  record(
    "a failed send does not block the next request",
    "created (201)",
    retryAfterFailure.status === 201,
    `status ${retryAfterFailure.status}`,
  );

  // --- anon has no access to any app table (grants were revoked from anon) ---
  for (const t of ["businesses", "customers", "messages", "feedback"]) {
    const ar = await req({ url: table(t, "?select=id"), token: ANON });
    record(
      `anon cannot read ${t}`,
      "denied (4xx) or empty",
      ar.status >= 400 || (Array.isArray(ar.rows) && ar.rows.length === 0),
      `status ${ar.status}`,
    );
    const aw = await req({ url: table(t), method: "POST", token: ANON, body: {} });
    record(
      `anon cannot write ${t}`,
      "denied (4xx)",
      aw.status >= 400,
      `status ${aw.status}`,
    );
  }

  // --- waitlist: no browser access (anon or authenticated) ---
  // Anon is simulated exactly as a browser would: apikey AND Authorization set to
  // the public anon key. Without Authorization the server 401s for missing
  // credentials, which would prove nothing about grants/RLS.
  const anonRead = await req({ url: table("waitlist", "?select=id"), token: ANON });
  record(
    "anon cannot read waitlist",
    "denied (4xx) or empty",
    anonRead.status >= 400 || (Array.isArray(anonRead.rows) && anonRead.rows.length === 0),
    `status ${anonRead.status}`,
  );
  const anonWrite = await req({
    url: table("waitlist"),
    method: "POST",
    token: ANON,
    body: { email: `anon-${Date.now()}@example.com` },
  });
  record("anon cannot write waitlist", "denied (4xx)", anonWrite.status >= 400, `status ${anonWrite.status}`);
  const authedRead = await req({ url: table("waitlist", "?select=id"), token: B.jwt });
  record(
    "authenticated cannot read waitlist",
    "denied (4xx) or empty",
    authedRead.status >= 400 || (Array.isArray(authedRead.rows) && authedRead.rows.length === 0),
    `status ${authedRead.status}`,
  );
  const authedWrite = await req({
    url: table("waitlist"),
    method: "POST",
    token: B.jwt,
    body: { email: `authed-${Date.now()}@example.com` },
  });
  record(
    "authenticated cannot write waitlist",
    "denied (4xx)",
    authedWrite.status >= 400,
    `status ${authedWrite.status}`,
  );

  // --- CSV export: an owner's export is scoped to their own customers ---
  // B gets real data of their own first — including an accented name (UTF-8)
  // and a formula-injection payload — so a wrong file fails on any layer.
  const bBiz = await req({
    url: table("businesses"),
    method: "POST",
    token: B.jwt,
    prefer: "return=representation",
    body: {
      owner_id: B.id,
      name: "B Salon",
      google_review_link: "https://g.page/r/example/review",
      message_template: "Hi {customer_name}, thanks for coming in. {review_link}",
    },
  });
  if (bBiz.status !== 201 || !bBiz.rows?.[0]?.id) {
    throw new Error(`B business insert failed: ${bBiz.status} ${JSON.stringify(bBiz.rows)}`);
  }
  ids.businessB = bBiz.rows[0].id;

  const bAddCustomer = async (body) => {
    const r = await req({
      url: table("customers"),
      method: "POST",
      token: B.jwt,
      prefer: "return=representation",
      body: { business_id: ids.businessB, ...body },
    });
    if (r.status !== 201) {
      throw new Error(`B customer insert failed: ${r.status} ${JSON.stringify(r.rows)}`);
    }
    return r.rows[0].id;
  };
  await bAddCustomer({ name: "B Customer", phone: "+447700900999", email: "bc@example.com" });
  await bAddCustomer({ name: "Zoë Ángel", phone: "+447700900111" });
  await bAddCustomer({ name: "=1+1", email: "formula@example.com" });

  const unreachable = (r) =>
    r.status === 0
      ? `dev server not reachable at ${APP_URL} — start it first (npm run dev -- -p 3100). ${r.detail ?? ""}`
      : "";

  const bExport = await exportCsv(B.jwt);
  record(
    "owner B's export contains only B's customers",
    "200, B's rows, none of A's, dated filename",
    bExport.status === 200 &&
      bExport.text.includes("B Customer") &&
      bExport.text.includes("Zoë Ángel") &&
      !bExport.text.includes("Customer One") &&
      !bExport.text.includes("+447700900555") &&
      !bExport.text.includes("c1@example.com") &&
      /^attachment; filename="customers-\d{4}-\d{2}-\d{2}\.csv"$/.test(bExport.disposition),
    unreachable(bExport) || `status ${bExport.status}`,
  );

  const aExport = await exportCsv(A.jwt);
  record(
    "owner A's export contains none of B's customers",
    "200, A's rows, none of B's",
    aExport.status === 200 &&
      aExport.text.includes("Customer One") &&
      !aExport.text.includes("B Customer") &&
      !aExport.text.includes("Zoë Ángel") &&
      !aExport.text.includes("=1+1"),
    unreachable(aExport) || `status ${aExport.status}`,
  );

  record(
    "formula-injection cells and + phones export as text",
    "'=1+1 and '+447700900999",
    bExport.text.includes("'=1+1") && bExport.text.includes("'+447700900999"),
    unreachable(bExport) || `status ${bExport.status}`,
  );

  const anonExport = await exportCsv(null);
  record(
    "an export without a login is refused",
    "401",
    anonExport.status === 401,
    unreachable(anonExport) || `status ${anonExport.status}`,
  );

  // --- positive control: A still reaches their own data ---
  const aRead = await readCount(A.jwt, "businesses", ids.business);
  record("A can still read their own business", "1 row", aRead.count === 1, `rows ${aRead.count}`);
  const aUpd = await updateCount(A.jwt, "businesses", ids.business, { name: "A Salon Updated" });
  record("A can still update their own business", "1 row", aUpd.count === 1, `rows ${aUpd.count}`);
} catch (err) {
  fatal = true;
  console.error(`\nFatal: ${err.message}`);
} finally {
  for (const user of [A, B]) {
    if (user?.id) {
      await req({
        url: `${authAdmin}/${user.id}`,
        method: "DELETE",
        apiKey: SERVICE,
        token: SERVICE,
      }).catch(() => {});
    }
  }
}

const width = Math.max(...results.map((r) => r.name.length), 20);
let failed = 0;
console.log("\nRLS isolation check\n");
for (const r of results) {
  if (!r.pass) failed++;
  console.log(
    `${r.pass ? "PASS" : "FAIL"}  ${r.name.padEnd(width)}  expected: ${r.expected}  |  ${r.detail}`,
  );
}
console.log(`\n${results.length - failed}/${results.length} passed`);
// Set exitCode and let the process drain instead of force-exiting: on Windows,
// process.exit() while fetch keep-alive sockets are open trips a libuv assertion
// and corrupts the exit code. A fatal error always exits non-zero.
process.exitCode = fatal || failed ? 1 : 0;
