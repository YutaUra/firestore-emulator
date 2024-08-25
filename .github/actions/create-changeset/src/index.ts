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

  const packages = await buildPnpmWorkspaceTree(workspaceYaml)

  const changedPackages = Object.entries(packages)
    .filter(([_, { dir }]) => {
      return diff.some((d) => d.startsWith(`${dir}/`))
    })
    .map(([name]) => name)

  const affectedPackages = Object.entries(packages).filter(
    ([, { dependsOn, isPrivate }]) =>
      changedPackages.some((cp) => dependsOn.includes(cp)) && !isPrivate,
  )

  console.log('diff', diff)
  console.log('workspaceYaml', workspaceYaml)
  console.log('packages', packages)
  console.log('changedPackages', changedPackages)
  console.log('affectedPackages', affectedPackages)

  if (affectedPackages.length === 0) {
    console.log('no affected packages')
    return
  }

  const filename = join(
    '.changeset',
    message.replace(/\s/g, '-').replace(/\//g, '_').toLowerCase() + '.md',
  )

  const changeset = `---
${affectedPackages.map(([name]) => `"${name}": patch`).join('\n')}
---

${message}`
  console.log('changeset', changeset)
  await writeFile(filename, changeset)

  await execAsync(`git add ${filename}`)
  await execAsync(`git commit -m "create changeset for renovate"`)
  await execAsync(`git push`)
}

void main()
