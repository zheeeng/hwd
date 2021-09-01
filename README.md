# hwd

Create for pnpm monorepo project. It configs the resolution strategy by using [exports sugar](https://nodejs.org/api/packages.html#packages_exports_sugar). 

You can import the dependent modules in other workspaces, i.e. `import { foo } from '@monorepo/foo/shared/bar'`.  Node(v12.11.0+) and many bundlers  `webpack`, `rollup`, `vite` has already support this feature for resolving the correct package `bar` in the `node_modules` of `@monorepo/foo`.

By default, the internal workspace is recognized by the pnpm style package version `workspace: *`

## Usage

```shell
$: pnpx hwd -h                                                                                                                                                                                 

hwd(hoistWorkspaceDependencies): hoist workspace dependencies to the exports field of package.json
        -h	print the help message.
        -s	specify the shared folder alias, default to 'shared'.
        -n	specify the node_modules folder alias, default to 'node_modules'.
        -w	specify the internal workspace package mark, default to the pnpm specification 'workspace', e.g. '"foo": "workspace:*"'
        -c	specify the package root, default to the current work directory.
```

## How to configure Typescript declaration?

Configure the `path` field of the root `tsconfig.json`:

```json
{
    "paths": {
        "@monorepo/foo/shared/*": ["./packages/foo/node_modules/*", "./packages/foo/node_modules/@types/*"]
    }
}
```
