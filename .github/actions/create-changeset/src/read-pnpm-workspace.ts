import { readFile } from 'node:fs/promises'

import yaml from 'js-yaml'
import { z } from 'zod'

const workspaceSchema = z.object({
  packages: z.array(z.string()),
})

export type PnpmWorkspace = z.infer<typeof workspaceSchema>

export const readPnpmWorkspace = async (workspaceFilePath: string) => {
  return workspaceSchema.parse(
    yaml.load(await readFile(workspaceFilePath, 'utf-8')),
  )
}
