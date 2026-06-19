# Fix ESM imports in compiled JS files
# Adds .js extensions to relative imports, excludes node built-ins

$builtins = @('fs', 'path', 'crypto', 'http', 'https', 'url', 'stream', 'buffer', 'events', 'util', 'os', 'child_process', 'fs/promises')

Get-ChildItem -Path dist -Filter *.js -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw

    # Fix relative imports: from './foo' -> from './foo.js'
    # Fix relative imports: from '../foo' -> from '../foo.js'
    $content = $content -replace "from\s+['""](\.\./[^'""]+)['""]\s*;", "from '`$1.js';"
    $content = $content -replace "from\s+['""](\.\/[^'""]+)['""]\s*;", "from '`$1.js';"

    # Fix double .js.js
    $content = $content -replace '\.js\.js', '.js'

    # Don't add .js to node built-ins
    foreach ($builtin in $builtins) {
        $content = $content -replace "from\s+['""]$builtin\.js['""]\s*;", "from '$builtin';"
    }

    Set-Content $_.FullName $content -NoNewline
}

Write-Host "Fixed ESM imports in dist/"
