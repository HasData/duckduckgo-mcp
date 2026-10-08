// Tool contract test.
//
// The README promises one tool, a specific parameter set, and specific enum sizes for the region
// and language codes. Any of those can change upstream without a commit here, and the README
// would start lying silently. These checks catch that before a user does.
//
// The last test runs a real search. Listing tools accepts any non-empty key, so a contract check
// that only lists tools stays green with a revoked or mistyped key. That call costs 10 credits,
// which is the price of a canary that can fail for the right reason.
//
// Run: HASDATA_API_KEY=your_key_here npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ENDPOINT = 'https://mcp.hasdata.com/mcp?apis=duckduckgo';
const KEY = process.env.HASDATA_API_KEY;
const TIMEOUT_MS = 30_000;

const TOOL = 'hasdata_duckduckgo_serp_getSearchResults';
// Parameters the README documents. Values are the enum lengths it quotes, or null when the
// parameter has no enum.
const PARAMS = {
    q: null,
    nextPageToken: null,
    kl: 37,
    cc: 36,
    setLang: 33,
    safeSearch: 3,
    deviceType: 3,
};

// A streamable HTTP body arrives either as plain JSON or as server-sent events. One SSE event
// can span several data: lines, several events can share one response, and a server is free to
// send progress notifications before the answer. So collect every event and pick the message
// carrying our request id.
function parseRpc(raw, id) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed);

    const messages = [];
    for (const event of trimmed.split(/\r?\n\r?\n+/)) {
        const data = event
            .split(/\r?\n/)
            .filter((l) => l.startsWith('data:'))
            .map((l) => l.slice(5).replace(/^ /, ''))
            .join('\n');
        if (!data || data === '[DONE]') continue;
        try {
            messages.push(JSON.parse(data));
        } catch {
            // A keep-alive or a partial event is not our response.
        }
    }
    assert.ok(messages.length, `no JSON-RPC message in the response: ${raw.slice(0, 300)}`);
    const match = messages.find((m) => m.id === id);
    assert.ok(match, `no message with id ${id} in the response: ${raw.slice(0, 300)}`);
    return match;
}

let nextId = 1;

async function rpc(method, params = {}) {
    // The CI key sits on the free plan, where concurrency is 1. When several of
    // these repos are pushed at once their contract runs collide, and HasData
    // answers 429 with code concurrency_limit straight away rather than queueing.
    // That is a plan limit, not a broken contract, so the call is retried before
    // the test gives up. A 401 still fails on the first attempt.
    for (let attempt = 1; ; attempt++) {
        const id = nextId++;
        const res = await fetch(ENDPOINT, {
            method: 'POST',
            headers: {
                'x-api-key': KEY,
                'Content-Type': 'application/json',
                // The server answers over streamable HTTP, so accept both a plain body and a stream.
                Accept: 'application/json, text/event-stream',
            },
            body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        assert.equal(res.status, 200, `${method} returned ${res.status}`);
        const raw = await res.text();
        if (raw.includes('concurrency_limit') && attempt < 5) {
            await new Promise((r) => setTimeout(r, attempt * 4000));
            continue;
        }
        return { raw, body: parseRpc(raw, id) };
    }
}

let toolsPromise;
function listTools() {
    toolsPromise ??= rpc('tools/list').then(({ body }) => {
        assert.ok(body.result?.tools, 'the response carried no result.tools');
        return body.result.tools;
    });
    return toolsPromise;
}

const live = { skip: KEY ? false : 'HASDATA_API_KEY is not set, skipping the live checks' };

test('apis=duckduckgo exposes exactly one tool', live, async () => {
    const tools = await listTools();
    const names = tools.map((t) => t.name).join(', ');
    assert.equal(tools.length, 1, `expected 1 tool, got ${tools.length}: ${names}`);
});

test('the tool name has not changed', live, async () => {
    const tools = await listTools();
    assert.equal(tools[0].name, TOOL, `the tool is now called ${tools[0].name}`);
});

test('every documented parameter still exists', live, async () => {
    const [tool] = await listTools();
    const props = tool.inputSchema?.properties ?? {};
    for (const name of Object.keys(PARAMS)) {
        assert.ok(props[name], `parameter ${name} is documented in the README but missing upstream`);
    }
});

// The README quotes these counts in prose and in a badge. If DuckDuckGo gains a region, the
// numbers go stale, and this is the only thing that would notice.
test('the region and language enums are the size the README claims', live, async () => {
    const [tool] = await listTools();
    const props = tool.inputSchema?.properties ?? {};
    for (const [name, size] of Object.entries(PARAMS)) {
        if (size === null) continue;
        const values = props[name]?.enum ?? [];
        assert.equal(
            values.length,
            size,
            `${name} now has ${values.length} values, the README says ${size}`
        );
    }
});

test('safeSearch still takes off, moderate and strict', live, async () => {
    const [tool] = await listTools();
    const values = tool.inputSchema?.properties?.safeSearch?.enum ?? [];
    assert.deepEqual([...values].sort(), ['moderate', 'off', 'strict']);
});

test('the tool carries a description', live, async () => {
    const [tool] = await listTools();
    assert.ok((tool.description || '').trim().length > 20, 'the description is empty or near-empty');
});

test('the key is accepted by HasData', live, async () => {
    const { raw } = await rpc('tools/call', {
        name: TOOL,
        arguments: { q: 'model context protocol' },
    });
    assert.ok(!raw.includes('401 Unauthorized'), 'HasData rejected the key');
    assert.ok(!raw.includes('"isError":true'), `the tool call failed: ${raw.slice(0, 300)}`);
});

// The prompts and resources section of the README is generated from the live server, and the
// server changes it without a commit here: Indeed gained two parameter resources overnight on
// 2026-10-08 and the table fell behind the same day. These checks need no API key, because
// prompts/list and resources/list are served without one, so they run on a fork too.
// README prompts and resources section
const README_MD = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');

async function anonymousRpc(method) {
    const id = nextId++;
    const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
        body: JSON.stringify({ jsonrpc: '2.0', id, method, params: {} }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    assert.equal(res.status, 200, `${method} returned ${res.status}`);
    return parseRpc(await res.text(), id).result;
}

// The section writes "ships one prompt" for a single entry and "ships 7 prompts" otherwise.
const statedCount = (verb) => {
    const m = README_MD.match(new RegExp(verb + String.raw`\s+(one|\d+)\s`));
    if (!m) return null;
    return m[1] === 'one' ? 1 : Number(m[1]);
};

test('the README states how many prompts the server serves', async () => {
    const { prompts } = await anonymousRpc('prompts/list');
    const stated = statedCount('ships');
    if (!prompts.length) {
        assert.equal(stated, null, 'the README claims prompts the server does not serve');
        return;
    }
    assert.ok(stated !== null, 'the server serves prompts and the README does not say how many');
    assert.equal(stated, prompts.length, `the README says ${stated} prompts, the server serves ${prompts.length}`);
});

test('the README states how many resources the server serves', async () => {
    const { resources } = await anonymousRpc('resources/list');
    const stated = statedCount('exposes');
    if (!resources.length) {
        assert.equal(stated, null, 'the README claims resources the server does not serve');
        return;
    }
    assert.ok(stated !== null, 'the server serves resources and the README does not say how many');
    assert.equal(stated, resources.length, `the README says ${stated} resources, the server serves ${resources.length}`);
});

test('every parameter with a fixed list is named in the README', async () => {
    const { resources } = await anonymousRpc('resources/list');
    const missing = resources
        .map((r) => (r.uri || '').split('/').pop())
        .filter((p) => p && !README_MD.includes(`\`${p}\``));
    assert.deepEqual(missing, [], `parameters the README does not name: ${missing.join(', ')}`);
});
