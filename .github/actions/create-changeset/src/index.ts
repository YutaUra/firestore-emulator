import { exec } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'

import { getInput } from '@actions/core'

import { buildPnpmWorkspaceTree } from './build-pnpm-workspace-tree'
import { readPnpmWorkspace } from './read-pnpm-workspace'

const PNPM_WORKSPACE_FILE_PATH = join(
  __dirname,
  '../../../../pnpm-workspace.yaml',
)

const execAsync = promisify(exec)

const main = async () => {
  const diff = getInput('diff', { required: true })
    .split(' ')
    .map((v) => resolve(v.replace(/^'|'$/g, '')))
  const message = getInput('message', { required: true })

  const workspaceYaml = await readPnpmWorkspace(PNPM_WORKSPACE_FILE_PATH)

  const results = await buildPnpmWorkspaceTree(workspaceYaml)

  const affectedPackages = Object.entries(results).filter(([_, { dir }]) => {
    return diff.some((d) => d.startsWith(`${dir}/`))
  })

  const filename = join(
    '.changeset',
    message.replace(/\s/g, '-').replace(/\//g, '_').toLowerCase() + '.md',
  )

  const changeset = `---
  ${affectedPackages
    .filter(([_, v]) => !v.private)
    .map(([name]) => `"${name}": patch`)
    .join('\n')}
  ---
  
  ${message}`
  console.log('changeset', changeset)
  await writeFile(filename, changeset)

  await execAsync(`git config --global user.name github-actions[bot]`)
  await execAsync(
    `git config --global user.email 41898282+github-actions[bot]@users.noreply.github.com`,
  )
  await execAsync(`git add ${filename}`)
  await execAsync(`git commit -m "create changeset for renovate"`)
  await execAsync(`git push`)
}

void main()
