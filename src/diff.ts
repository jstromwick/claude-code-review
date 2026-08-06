import type { GitHub } from '@actions/github/lib/utils';
import type { ChangedFile } from './types';

export async function getChangedFiles(
  octokit: InstanceType<typeof GitHub>,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<ChangedFile[]> {
  const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });

  return files.map(
    (file: Awaited<ReturnType<typeof octokit.rest.pulls.listFiles>>['data'][number]) => ({
      filename: file.filename,
      status: file.status,
      patch: file.patch,
    })
  );
}
