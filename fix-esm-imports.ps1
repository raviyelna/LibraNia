# Fix ESM imports in compiled JS files
# Adds .js extensions to relative imports, excludes node built-ins

$builtins = @('fs', 'path', 'crypto', 'http', 'https', 'url', 'stream', 'buffer', 'events', 'util', 'os', 'child_process', 'fs/promises')

Get-ChildItem -Path dist -Filter *.js -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw

    # Fix relative imports (../ and ./)
    $content = $content -replace "from '(\.\./[^']+)'", "from '`$1.js'"
    $content = $content -replace "from '(\./[^']+)'", "from '`$1.js'"

    # Remove double .js.js
    $content = $content -replace '\.js\.js', '.js'

    # Revert built-in modules
    foreach ($builtin in $builtins) {
        $content = $content -replace "from '$builtin\.js'", "from '$builtin'"
    }

    Set-Content $_.FullName -Value $content -NoNewline
}

Write-Host "Fixed ESM imports in dist/"
