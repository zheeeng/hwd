#!/usr/bin/env node
const fs = require('fs') as typeof import('fs')
const path = require('path') as typeof import('path')

const argv = process.argv.slice(2).join(' ')

if (argv === '-h') {
    process.stdout.write(`\
\nhwd(hoistWorkspaceDependencies): hoist workspace dependency entries to the exports field of the project package.json
        -h\tprint the help message.
        -s\tspecify the shared folder alias, default to 'shared'.
        -n\tspecify the node_modules folder alias, default to 'node_modules'.
        -w\tspecify the internal workspace package mark, default to the pnpm specification 'workspace', e.g. '"foo": "workspace:*"'
        -c\tspecify the package root, default to the current work directory.
`)

    process.exit()
}

const cliRegexp = /-([snwp]) (\w+)/g

const option = {
    sharedFolderName: 'shared',
    nodeModulesFolderName: 'node_modules',
    workspaceMark: 'workspace',
    cwd: process.cwd(),
}
const argvUseless = argv.replace(cliRegexp, (_, $cmd, $value) => {
    switch ($cmd) {
        case 's': {
            option.sharedFolderName = $value
            break
        }
        case 'n': {
            option.nodeModulesFolderName = $value
            break
        }
        case 'w': {
            option.workspaceMark = $value
            break
        }
        case 'p': {
            option.cwd = $value
            break
        }
    }

    return ''
})

if (argvUseless.trim()) {
    if ((/-[\w]/).test(argvUseless)) {
        process.stdout.write('too many arguments')
    } else {
        process.stdout.write('invalid arguments!')
    }
    process.exit(0)
}

const pkgPath = path.resolve(option.cwd, './package.json')
const pkg: { exports?: Record<string, string>, dependencies?: Record<string, string> } = require(pkgPath)

const nonWorkspaceDependencyNames = Object.entries<string>(pkg?.dependencies ?? {}).filter(([name, ver]) => !name.startsWith('@types') && !ver.startsWith(option.workspaceMark))

const pkgs = nonWorkspaceDependencyNames.map(([name]): [name: string, pkgEntry: string] | null => {
    type packageExportsEntryPath = string | null
    type packageExportsEntryObject = {
        require: packageExportsEntryPath
        import: packageExportsEntryPath,
        node: packageExportsEntryPath,
        default: packageExportsEntryPath
    }

    try {
        const depPkg: { main?: string, exports?: Record<string, packageExportsEntryPath> | Record<string, packageExportsEntryObject>, } = require(path.resolve(option.cwd, `./${option.nodeModulesFolderName}/${name}/package.json`))

        const pkgMainField = depPkg.main
        const pkgEntryFromExportsField = depPkg.exports?.['.']
        const pkgEntry = typeof pkgEntryFromExportsField === 'string' ? pkgEntryFromExportsField : (pkgEntryFromExportsField?.default ?? pkgEntryFromExportsField?.import ?? pkgEntryFromExportsField?.require ?? pkgEntryFromExportsField?.node) ?? pkgMainField ?? 'index.js'
    
        return [name, pkgEntry]
    } catch (e) {
        return null
    }
}).filter(<T>(i: T | null): i is T => !!i)

const exportsField = pkgs.reduce<Record<string, string>>((field, [pkgName, pkgEntry]) => {
    field[`./${option.sharedFolderName}/${pkgName}`] = `./${option.nodeModulesFolderName}/${pkgName}/${pkgEntry}`

    return field
}, {})

const originExportsField = Object.entries(pkg.exports ?? {}).reduce<Record<string, string>>((field, [pkgName, pkgEntry]) => {
    if (pkgName.startsWith(`./${option.sharedFolderName}/`)) return field

    field[pkgName] = pkgEntry

    return field
}, {})

const modifiedPkg = {
    ...pkg,
    exports: Object.fromEntries(new Map([
        ...Object.entries(exportsField),
        ...Object.entries(originExportsField),
    ]))
}

fs.writeFileSync(pkgPath, JSON.stringify(modifiedPkg, null, 2))
