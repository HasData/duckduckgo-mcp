---
description: An unpersonalised ranking for a query, used as a baseline
---

Take a query and report the ranking DuckDuckGo shows, as a baseline no account personalised.

Ask me for the query and the region if I have not given them. Region goes in `kl`, written the way DuckDuckGo writes it, such as `us-en`.

Then:

1. Call `hasdata_duckduckgo_serp_getSearchResults` with `q` and `kl`.
2. List the organic results as position, title and domain, and say how many came back rather than assuming ten.
3. Read the results before reporting them. DuckDuckGo fills the page whether or not anything matches, so if the entries are only loosely related, say the query has no real coverage instead of presenting them as a ranking.
4. If the `ads` block is present, list the advertisers separately from the organic set so the two never blur.
5. If `searchAssist` is present, quote it and name the sources it leans on.
6. Page with `nextPageToken` when I ask for more, and pass the token on its own with no `q` beside it. Positions restart at 1 on each page, so absolute rank is the count already collected plus `position`.

Do not describe this as what everyone sees, and do not compare it to another engine unless that engine's results are also in front of you.
