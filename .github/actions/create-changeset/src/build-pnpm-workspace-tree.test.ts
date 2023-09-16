import { join } from 'node:path'

import { it } from 'vitest'

import { buildPnpmWorkspaceTree } from './build-pnpm-workspace-tree'
import { readPnpmWorkspace } from './read-pnpm-workspace'

const PNPM_WORKSPACE_FILE_PATH = join(
  __dirname,
  '../../../../pnpm-workspace.yaml',
)

it('should work', async () => {
  console.log('PNPM_WORKSPACE_FILE_PATH', PNPM_WORKSPACE_FILE_PATH)
  const workspaceYaml = await readPnpmWorkspace(PNPM_WORKSPACE_FILE_PATH)
  console.log('workspaceYaml', workspaceYaml)

  const results = await buildPnpmWorkspaceTree(workspaceYaml)

  console.log(results)
})
