import * as core from '@actions/core';
import * as github from '@actions/github';
import { getChangedFiles } from './diff';
import { reviewDiff } from './anthropic';
import { matchesAny } from './glob';
import { Logger } from './utils/logger';

const logger = new Logger();

async function run(): Promise<void> {
  const apiKey = core.getInput('anthropic_api_key', { required: true });
  const token = core.getInput('github_token', { required: true });
  const model = core.getInput('model') || 'claude-sonnet-5';
  const maxFiles = parseInt(core.getInput('max_files') || '40', 10);
  const excludePatterns = core
    .getInput('exclude')
    .split(',')
    .map((pattern) => pattern.trim())
    .filter(Boolean);

  const pullRequest = github.context.payload.pull_request;
  if (!pullRequest) {
    logger.log('Event has no pull_request payload, skipping.');
    return;
  }

  const octokit = github.getOctokit(token);
  const { owner, repo } = github.context.repo;
  const pullNumber = pullRequest.number;

  let files = await getChangedFiles(octokit, owner, repo, pullNumber);
  files = files.filter((file) => file.patch && !matchesAny(excludePatterns, file.filename));

  if (files.length === 0) {
    logger.log('No reviewable file changes found.');
    return;
  }

  if (files.length > maxFiles) {
    logger.warn(
      `${files.length} changed files exceeds max_files=${maxFiles}; reviewing the first ${maxFiles}.`
    );
    files = files.slice(0, maxFiles);
  }

  const result = await reviewDiff(apiKey, model, pullRequest.title, pullRequest.body ?? '', files);

  const validPaths = new Set(files.map((file) => file.filename));
  const comments = result.comments
    .filter((comment) => validPaths.has(comment.path))
    .map((comment) => ({ path: comment.path, line: comment.line, body: comment.body }));

  try {
    await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      body: result.summary,
      event: result.event,
      comments,
    });
  } catch (error) {
    logger.warn(
      `Failed to post inline review comments, falling back to a summary-only comment: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      body: result.summary,
      event: 'COMMENT',
    });
  }

  core.setOutput('review_event', result.event);
  core.setOutput('comment_count', String(comments.length));
}

run().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
