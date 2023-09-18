import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { glob } from 'glob'
import { z } from 'zod'

import type { PnpmWorkspace } from './read-pnpm-workspace'

const PACKAGE_ROOT = resolve(join(__dirname, '../../../../'))

const packageJsonSchema = z
  .object({
    dependencies: z.record(z.string()).default({}),
    devDependencies: z.record(z.string()).default({}),
    name: z.string(),
    private: z.boolean().default(false),
  })
  .strip()

const getAllDependencies = (
  allDependencies: Record<string, string[]>,
  packagesTree: Record<
    string,
    {
      readonly dependsOn: readonly string[]
    }
  >,
  packageName: string,
): string[] => {
  const pkg = packagesTree[packageName]
  if (!pkg) throw new Error(`Package ${packageName} not found in workspace`)
  if (allDependencies[packageName]) {
    return allDependencies[packageName] ?? []
  }
  if (pkg.dependsOn.length === 0) {
    allDependencies[packageName] = []
    return []
  }
  allDependencies[packageName] = Array.from(
    new Set([
      ...pkg.dependsOn,
      ...pkg.dependsOn.flatMap((dep) =>
        getAllDependencies(allDependencies, packagesTree, dep),
      ),
    ]),
  )
  return allDependencies[packageName] ?? []
}

export const buildPnpmWorkspaceTree = async (workspace: PnpmWorkspace) => {
  const packages = await Promise.all(
    workspace.packages.map(async (packagePath) => {
      const files = await glob(`${PACKAGE_ROOT}/${packagePath}/package.json`)

      return await Promise.all(
        files.map(async (packageJsonPath) => {
          const packageJson = packageJsonSchema.parse(
            JSON.parse(await readFile(packageJsonPath, 'utf-8')),
          )

          return {
            dependencies: Object.fromEntries(
              Object.entries(packageJson.dependencies).filter(([_, v]) =>
                v.startsWith('workspace:'),
              ),
            ),
            devDependencies: Object.fromEntries(
              Object.entries(packageJson.devDependencies).filter(([_, v]) =>
                v.startsWith('workspace:'),
              ),
            ),
            isPrivate: packageJson.private,
            name: packageJson.name,
            path: packageJsonPath,
          }
        }),
      )
    }),
  ).then((v) => v.flat())

  const packagesTree = Object.fromEntries(
    packages.map((pkg) => {
      return [
        pkg.name,
        {
          dependsOn: [
            ...Object.keys(pkg.dependencies),
            ...Object.keys(pkg.devDependencies),
          ],
          dir: resolve(pkg.path, '..'),
          isPrivate: pkg.isPrivate,
        },
      ] as const
    }),
  )

  const allDependencies: Record<string, string[]> = {}

  return Object.fromEntries(
    Object.entries(packagesTree).map(([name, pkg]) => {
      return [
        name,
        {
          ...pkg,
          dependsOn: getAllDependencies(allDependencies, packagesTree, name),
        },
      ] as const
    }),
  )
}
