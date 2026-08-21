# DuckDuckGo MCP Server

A hosted Model Context Protocol (MCP) server that gives Claude, Cursor, Windsurf and any other MCP client DuckDuckGo search results as structured JSON. Ranked organic results with positions, ads in their own array, DuckDuckGo's own AI answer, and 37 regions to target. Built for volume and for parsing, with no local browser and no fallback chain to configure.

```
https://mcp.hasdata.com/api/mcp?apis=duckduckgo
```

[![tool contract](https://github.com/HasData/duckduckgo-mcp/actions/workflows/contract.yml/badge.svg)](https://github.com/HasData/duckduckgo-mcp/actions/workflows/contract.yml)
[![MCP](https://img.shields.io/badge/MCP-remote%20%7C%20streamable%20HTTP-6366f1?style=flat-square)](https://modelcontextprotocol.io)
[![Regions](https://img.shields.io/badge/regions-37-10b981?style=flat-square)](#tools)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

## Contents

- [What you need](#what-you-need)
- [Quick start](#quick-start)
- [Example prompts](#example-prompts)
- [Tools](#tools)
- [Errors and failure paths](#errors-and-failure-paths)
- [Pricing, free tier and limits](#pricing-free-tier-and-limits)
- [Tool selection](#tool-selection)
- [How it compares](#how-it-compares)
- [FAQ](#faq)
- [HasData links](#hasdata-links)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## What you need

An MCP client that speaks streamable HTTP with custom headers. A HasData API key from the [dashboard](https://app.hasdata.com/sign-up?utm_source=github&utm_medium=syndication&utm_campaign=duckduckgo-mcp), free to create. Nothing else. This is a remote server. There is no Python environment to manage, no browser package to add and no local process that has to stay up.

## Quick start

The server URL is the same for every client. We run it hands-on in Claude Code and Claude Desktop. The other blocks follow each client's own documented format for a remote server.

| Field | Value |
| :--- | :--- |
| URL | `https://mcp.hasdata.com/api/mcp?apis=duckduckgo` |
| Transport | HTTP, streamable |
| Auth header | `x-api-key: your_key_here` |

Clients with OAuth support can add the same URL as a connector and sign in without putting a key in a config file.

<details>
<summary><b>Claude Code</b></summary>

```bash
claude mcp add --transport http duckduckgo "https://mcp.hasdata.com/api/mcp?apis=duckduckgo" \
  --header "x-api-key: your_key_here"
```

</details>

<details>
<summary><b>Claude Desktop</b></summary>

Settings, then Connectors, then Add custom connector, then paste `https://mcp.hasdata.com/api/mcp?apis=duckduckgo` and sign in.

For the config-file route, Claude Desktop loads only local (stdio) servers, so a remote server is reached through the `mcp-remote` bridge, which needs Node. Add this to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "duckduckgo": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.hasdata.com/api/mcp?apis=duckduckgo",
        "--header",
        "x-api-key:your_key_here"
      ]
    }
  }
}
```

The `x-api-key:` value carries no space after the colon. Claude Desktop passes the argument without a shell, and a space splits the header.

</details>

<details>
<summary><b>Cursor</b></summary>

`~/.cursor/mcp.json` for every project, or `.cursor/mcp.json` for one:

```json
{
  "mcpServers": {
    "duckduckgo": {
      "url": "https://mcp.hasdata.com/api/mcp?apis=duckduckgo",
      "headers": { "x-api-key": "your_key_here" }
    }
  }
}
```

</details>

<details>
<summary><b>Windsurf</b></summary>

`~/.codeium/windsurf/mcp_config.json`. Windsurf calls the field `serverUrl`, not `url`:

```json
{
  "mcpServers": {
    "duckduckgo": {
      "serverUrl": "https://mcp.hasdata.com/api/mcp?apis=duckduckgo",
      "headers": { "x-api-key": "your_key_here" }
    }
  }
}
```

</details>

<details>
<summary><b>Cline</b></summary>

```json
{
  "mcpServers": {
    "duckduckgo": {
      "url": "https://mcp.hasdata.com/api/mcp?apis=duckduckgo",
      "type": "streamableHttp",
      "headers": { "x-api-key": "your_key_here" },
      "disabled": false
    }
  }
}
```

</details>

<details>
<summary><b>VS Code</b></summary>

`.vscode/mcp.json` in the workspace:

```json
{
  "servers": {
    "duckduckgo": {
      "type": "http",
      "url": "https://mcp.hasdata.com/api/mcp?apis=duckduckgo",
      "headers": { "x-api-key": "your_key_here" }
    }
  }
}
```

</details>

<details>
<summary><b>Codex CLI</b></summary>

`~/.codex/config.toml`:

```toml
[mcp_servers.duckduckgo]
url = "https://mcp.hasdata.com/api/mcp?apis=duckduckgo"

[mcp_servers.duckduckgo.headers]
"x-api-key" = "your_key_here"
```

</details>

<details>
<summary><b>Gemini CLI</b></summary>

`~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "duckduckgo": {
      "httpUrl": "https://mcp.hasdata.com/api/mcp?apis=duckduckgo",
      "headers": { "x-api-key": "your_key_here" }
    }
  }
}
```

</details>

## Example prompts

Prompts, not code. Paste one in and the agent calls the tool itself. Each is annotated with the calls it takes, because in MCP the model decides how many calls to make and every successful call costs 10 credits.

> Search DuckDuckGo for "model context protocol" and give me the top ten results with their positions and domains.

*One call, 10 credits.*

> Run the query "vpn review" in the German region and again in the US region, then tell me which domains appear in one and not the other.

*Two calls, 20 credits. Region is a parameter. The same query in two markets is two calls.*

> Search for "best crm software" and list only the paid placements, with the advertiser domain for each.

*One call, 10 credits. Ads arrive in their own array and need no filtering heuristics.*

> Take the query "model context protocol" and walk the first three pages, then tell me which domains hold more than one position.

*Three calls, 30 credits. Each page after the first is a fresh call with the cursor, and drop `q` from the arguments once you have one.*

> Search "who invented the transistor" and show me DuckDuckGo's own AI answer next to the organic results it drew on.

*One call, 10 credits.*

Two of those are the reason this server exists. Region targeting is a first-class parameter across 37 markets. Comparing one query across countries is a loop and not a proxy setup. And paid placements come back separately from organic, which keeps rank tracking from depending on guessing which result was an ad.

Paging costs a call each time. A prompt that walks ten pages is ten calls and 100 credits.

## Tools

One tool. Samples below are trimmed from real calls, and the results in them change as the web changes. Read them as shapes.

The samples are the payload, not the whole response. A `tools/call` result carries one text block, and that text is itself JSON holding `url`, `status`, `text` and `json`, with the scraped data under `json`. From a raw JSON-RPC response the path is `result.content[0].text`, parsed, then `.json`. A chat client unwraps that for you and code talking to the endpoint directly does not.

### Get DuckDuckGo search results

[`hasdata_duckduckgo_serp_getSearchResults`](https://docs.hasdata.com/apis/duckduckgo/serp?utm_source=github&utm_medium=syndication&utm_campaign=duckduckgo-mcp)

Fetches a DuckDuckGo results page and returns it parsed.

| Parameter | Type | Notes |
| :--- | :--- | :--- |
| `q` | string | The search term. Either `q` or `nextPageToken` has to be present |
| `nextPageToken` | string | Cursor from `pagination.nextPageToken` in the previous response. Wins if you send both, and the `q` you sent alongside it is ignored without a warning |
| `kl` | string | Region as `<country>-<language>`, 37 values from `us-en` and `de-de` to `jp-jp` and `wt-wt` for no region |
| `cc` | string | Two-letter country, 36 values. An alternative to `kl` when paired with `setLang` |
| `setLang` | string | Interface and result language, 33 values |
| `safeSearch` | string | `off`, `moderate` or `strict` |
| `deviceType` | string | `desktop`, `mobile` or `tablet` |

> Send either `q` or `nextPageToken`. Sending neither returns 422 naming both fields, because the requirement is conditional and the schema cannot express it as a plain required list. Sending both is not an error either, the cursor wins and the query goes nowhere, so an agent that keeps `q` in the arguments while paging silently reads the wrong result set.

> `position` counts inside the page it came from, not across the whole result set. Page two comes back with positions starting at 1 again, and page size is not fixed either, so pages of 10, 15 and 14 results all turn up. Absolute rank is therefore the number of organic results you have already collected plus `position`, not anything you can derive from the page number. Build a rank dataset without that and every page contributes its own number one.

Returns `organicResults`, `ads`, `searchAssist` and `pagination`. Organic entries carry `position`, `title`, `link`, `displayedLink`, `source` and `snippet`, plus a date, sitelinks and video metadata where DuckDuckGo shows them. `searchAssist` holds DuckDuckGo's own AI answer for the query.

> `ads` and `searchAssist` are absent when the page has neither, so test for the key before reading it. `organicResults` can be absent too, so read it with a default rather than treating its presence as given. A query with no real matches still comes back as a full page of loosely related entries, which is not how "nothing found" usually looks.

```json
{
  "organicResults": [
    {
      "position": 1,
      "title": "What is the Model Context Protocol (MCP)?",
      "link": "https://modelcontextprotocol.io/docs/getting-started/intro",
      "displayedLink": "modelcontextprotocol.io › docs › getting-started › intro",
      "source": "modelcontextprotocol.io",
      "snippet": "MCP is an open-source standard for connecting AI applications to external systems."
    }
  ],
  "ads": [
    { "position": 1, "title": "Make Agents Accountable", "link": "https://www.gravitee.io/platform/ai-agent-management" }
  ],
  "searchAssist": {
    "answer": "Model Context Protocol (MCP) is an open standard from Anthropic that lets LLMs connect to external tools, systems, and data sources using a shared interface."
  },
  "pagination": { "nextPageToken": "eyJ1cmwiOiJodHRwczovL2xpbmtzLmR1Y2tkdWNrZ28uY29t…" }
}
```

## Errors and failure paths

Your client almost never sees an HTTP error code from a tool call. The MCP layer answers 200 and puts the failure inside the result, with `isError` set to `true` and the reason as text. The agent reads a message where you might expect a status line.

**A wrong key surfaces as tool output, not as a failed connection.** Listing tools accepts any non-empty key, so the client completes its handshake and shows green. The first tool call then comes back with `isError: true` and the text `HasData API error: 401 Unauthorized`. Watch for that string, because nothing earlier in the flow reports the problem.

**A missing key is the one real HTTP error.** Authorization runs before any tool, and the connection itself fails with 401.

**An argument that breaks the schema is rejected before it becomes a search.** The server answers with `isError: true` and the text `MCP error -32602: Input validation error`, naming the field. Nothing is fetched and nothing is charged.

**Neither `q` nor `nextPageToken`** returns 422 with an `errors` array naming both fields and the `requiredIfNotExists` rule that ties them together.

**A query with nothing behind it still returns results.** DuckDuckGo decides relevance, so a nonsense string comes back as a normal page of ten loosely related entries with `ads` and `searchAssist` absent. Nothing marks it as a miss, which matters if you are building an alert on "no coverage for this brand".

Results that carry data also carry a `requestMetadata.id` worth quoting in support.

## Pricing, free tier and limits

Every call costs **10 credits**. The number of results does not change the price. A full page costs the same as a page with one entry.

The free trial is **1,000 credits over 30 days with no card**, which is 100 searches. After that an active account keeps getting 100 credits topped up each day whenever its balance drops under 100, so a low-volume agent runs on the free tier indefinitely.

Paid plans start at **$49 a month** for 200,000 credits, which is 20,000 searches. The unit price falls with volume, from **$2.45 per 1,000 searches** on the entry plan to **$0.99** on Business, **$0.83** on Growth and **$0.75** on the largest high-volume plans. Current numbers live on the [pricing page](https://hasdata.com/prices?utm_source=github&utm_medium=syndication&utm_campaign=duckduckgo-mcp).

Your plan also sets concurrency. The free trial allows 1 request at a time, Startup 15, Business 30, Growth 50, and the high-volume plans run from 200 to 1,500. Handle the overflow case defensively in anything unattended, because an agent that fans out will reach the ceiling before you do.

A request that comes back non-200 is not billed. A successful call that finds nothing is still a call.

## Tool selection

The `apis` query parameter decides which tools your agent sees. Fewer tools means less context spent on tool definitions, and fewer chances for the model to reach for the wrong one.

```
?apis=duckduckgo                        the one tool in this repo
?apis=duckduckgo,google_serp            add Google search
?apis=duckduckgo,bing_serp,google_serp  three engines side by side
```

The parameter takes provider names like `duckduckgo` and individual API names like `google_maps_search`. Misspelled names are ignored. If every name is wrong the request fails with 400, and the body lists both what it did not recognise and every valid value. Drop the parameter and the same endpoint exposes all 57 HasData tools.

Three engines in one agent is the common reason to widen the list here, because comparing the same query across DuckDuckGo, Google and Bing is a single prompt once all three are exposed.

## How it compares

The realistic alternative is a self-hosted server. The popular ones are Python packages you run locally, they reach DuckDuckGo from your own machine, and they hand the model a formatted text block. That works well for a research assistant answering one question at a time. It stops working when you want volume and a stable shape.

| | Self-hosted server | This server |
| :--- | :--- | :--- |
| What a search returns | A formatted text string built for the model to read | JSON with `position`, `title`, `link`, `displayedLink`, `source`, `snippet`, dates and sitelinks |
| Paid placements | Stripped out with the rest of the noise | Kept in a separate `ads` array |
| Pagination | A `max_results` cap on a single page | Cursor in every response |
| Regions | One `region` code | 37 region codes, or country and language set separately |
| SafeSearch | Fixed when the server starts, deliberately not callable by the agent | Per call |
| Who fetches the page | Your machine, over `httpx`, with an optional `curl_cffi` backend and a fallback to configure | Ours |
| Throughput | Self-throttled to 30 searches a minute | Plan concurrency, from 1 on the trial to 1,500 |
| What you run | A Python environment, an optional extra, and container or proxy settings when it is not on localhost | A URL and a header |
| Page content extraction | A `fetch_content` tool | Not offered |
| Cost | Free | 10 credits a call |

Two rows carry most of the decision. A text blob is the right output for a chat answer and the wrong one for a rank dataset, because reconstructing `position` out of prose is work you should not be doing. And the fetching being ours means the backend question goes away, along with picking between `httpx` and a browser-impersonating client, installing the extra that the fallback depends on, and reading a stack trace when a plain HTTP client stops getting a page back.

Everything else on that list is a real trade. A self-hosted server is free, needs no account, keeps your queries on your own machine, and fetches page content, which this server does not do. If you run a handful of searches a day inside one assistant, it is the better fit. This one is for the case where the number of searches, the number of regions, or the shape of the output starts to matter.

**Against DuckDuckGo's own API.** `api.duckduckgo.com` is the Instant Answer API, and it returns an encyclopedia abstract when one exists rather than a results page. There is no official endpoint that hands you ranked web results, which is why every option here parses the page.

**What this server does not do.** No page fetching or content extraction, no image or news verticals, no autocomplete. It returns the results page, parsed.

## FAQ

### Is there an official DuckDuckGo MCP server?

No. DuckDuckGo publishes no MCP server. Every option is built by somebody else. Most are open-source projects that run locally, and this one is a hosted server maintained by HasData.

### What is a DuckDuckGo MCP server?

A server that exposes DuckDuckGo search as a tool an AI client can call. The client sends a tool call over the Model Context Protocol, the server runs the search and returns structured JSON, and the model works with the result and never sees a page of HTML.

### Do I need a DuckDuckGo account or API key?

No. The only credential is your HasData key. DuckDuckGo has no developer programme to sign up for, and the Instant Answer API it does publish returns no search results.

### Do I need to host or run anything?

No. This is a remote MCP server on streamable HTTP. Nothing to install, no Python environment, no browser package, no process to restart.

### Is the data live or cached?

Live. Each call fetches the results page at request time and carries its own `requestMetadata.id`. Two identical calls are two separate fetches and not a replay of a stored copy.

### Can I compare the same query across regions?

Yes, and that is the main reason to use a parameter instead of a proxy. `kl` takes 37 region codes, and `cc` with `setLang` splits country and language when you need them apart. Each region is its own call.

### What happens when DuckDuckGo changes its layout?

Nothing on your side. We track the changes and keep the response schema stable, so field names and types stay put. A block with nothing to report is absent from the response, so read `ads` and `searchAssist` with a default.

### Can I use this together with other HasData APIs?

Yes. The `apis` parameter takes a list, and `?apis=duckduckgo,google_serp,bing_serp` gives your agent [three search engines at once](#tool-selection).

### Can I sign in with OAuth instead of pasting a key?

Yes, in clients that support it. Claude Desktop and Cursor can add the endpoint as a connector and sign in. Unattended agents and scripts use the `x-api-key` header.

### Compliance and personal data

HasData accesses publicly available data only. A platform's terms may restrict automated access, and you are responsible for your own compliance. Where the data you collect includes personal information, make sure you have a lawful basis for it under GDPR, CCPA or the equivalent rules in your jurisdiction.

## HasData links

| | |
| :--- | :--- |
| Product page and request builder | [DuckDuckGo SERP API](https://hasdata.com/apis/duckduckgo-serp-api?utm_source=github&utm_medium=syndication&utm_campaign=duckduckgo-mcp) |
| Server documentation | [MCP server docs](https://docs.hasdata.com/mcp-server?utm_source=github&utm_medium=syndication&utm_campaign=duckduckgo-mcp) |
| All 57 tools in one server | [HasData/hasdata-mcp](https://github.com/HasData/hasdata-mcp) |
| Client walkthroughs | [MCP clients and integrations](https://hasdata.com/integrations/mcp?utm_source=github&utm_medium=syndication&utm_campaign=duckduckgo-mcp) |
| The other search engines we parse | [Google, Bing and 53 more APIs](https://hasdata.com/apis/?utm_source=github&utm_medium=syndication&utm_campaign=duckduckgo-mcp) |
| Plans and credit costs | [Plans and credit costs](https://hasdata.com/prices?utm_source=github&utm_medium=syndication&utm_campaign=duckduckgo-mcp) |
| Keys and usage | [HasData dashboard](https://app.hasdata.com?utm_source=github&utm_medium=syndication&utm_campaign=duckduckgo-mcp) |

## Development

This repository is configuration and documentation for a remote server. There is no build step and nothing to containerize.

The tests in `test/` assert the tool contract, the part that can break without a commit here. They check that `?apis=duckduckgo` returns exactly one tool, that its name has not changed, that the parameters this README documents still exist with the enums it quotes, and that the key in use is actually accepted. That last check runs a real search and costs 10 credits, which is the price of a canary that can fail for the right reason.

```bash
# macOS and Linux
HASDATA_API_KEY=your_key_here npm test

# Windows PowerShell
$env:HASDATA_API_KEY="your_key_here"; npm test
```

The same suite runs in CI on every push and once a week on a schedule, because the upstream tool list can change without anyone touching this repository. A failure means the tool list moved, the key stopped working, or the endpoint was unreachable, and the assertion message says which.

## Contributing

Corrections to the parameter table and the response sample are the most useful contribution, because those are the parts that drift. Include the call you made and the response you got. Pull requests from forks run the suite without a key, and the live checks skip instead of going red.

## License

MIT. See [LICENSE](LICENSE).
