# claude-code-review

A GitHub Action that reviews pull requests using Claude. On every PR open or
update, it fetches the changed files, asks Claude for a structured review,
and posts the result back as a GitHub PR review with inline comments.

## Usage

Add a workflow to the repo you want reviewed (see
[`examples/review.yml`](examples/review.yml)):

```yaml
name: Claude Code Review

on:
  pull_request:
    types: [opened, synchronize]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: jstromwick/claude-code-review@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

Add `ANTHROPIC_API_KEY` as a repository or organization secret.

### Inputs

| Input               | Required | Default               | Description                                                               |
| ------------------- | -------- | --------------------- | ------------------------------------------------------------------------- |
| `anthropic_api_key` | yes      | —                     | Anthropic API key used to call Claude.                                    |
| `github_token`      | no       | `${{ github.token }}` | Token used to read PR data and post the review.                           |
| `model`             | no       | `claude-sonnet-5`     | Claude model id to use for the review.                                    |
| `max_files`         | no       | `40`                  | Maximum number of changed files to include in the review.                 |
| `exclude`           | no       | `''`                  | Comma-separated glob patterns of files to skip, e.g. `**/*.lock,dist/**`. |

### Outputs

| Output          | Description                                                                     |
| --------------- | ------------------------------------------------------------------------------- |
| `review_event`  | The review event Claude submitted (`APPROVE`, `COMMENT`, or `REQUEST_CHANGES`). |
| `comment_count` | Number of inline comments posted.                                               |

## How it works

1. Fetches the PR's changed files and diffs via the GitHub API.
2. Sends the diff, PR title, and PR description to Claude with a tool
   definition that forces a structured response (summary, review event,
   and a list of inline comments).
3. Posts the result as a single PR review via `pulls.createReview`. If any
   inline comment can't be anchored to the diff, falls back to a
   summary-only review comment.

## Development

```bash
npm install
npm run typecheck
npm run build   # bundles src/ into dist/index.js, which is committed
```

`dist/` is committed so the action can run without a build step. CI
(`.github/workflows/build.yml`) fails if `dist/` is out of date with `src/`.
