$files = @(
    'src/lib/understand/types.ts',
    '.lovable/src/lib/understand/types.ts',
    'src/lib/understand/context.ts',
    '.lovable/src/lib/understand/context.ts',
    'src/lib/understand/diff.ts',
    '.lovable/src/lib/understand/diff.ts',
    'src/lib/understand/agent-context.ts',
    '.lovable/src/lib/understand/agent-context.ts',
    'src/lib/understand/index.ts',
    '.lovable/src/lib/understand/index.ts',
    'src/components/workspace/KnowledgeGraphPanel.tsx',
    '.lovable/src/components/workspace/KnowledgeGraphPanel.tsx',
    'src/pages/WorkspacePage.tsx',
    '.lovable/src/pages/WorkspacePage.tsx',
    'cloudflare-worker/worker-mcp-drakon.js',
    '.lovable/cloudflare-worker/worker-mcp-drakon.js'
)

$allOk = $true
foreach($f in $files) {
    if(Test-Path $f) {
        Write-Host "OK    $f"
    } else {
        Write-Host "MISS  $f"
        $allOk = $false
    }
}

# Check content sync between src/ and .lovable/src/ pairs
Write-Host ""
Write-Host "--- Content Sync Check ---"
$pairs = @(
    @('src/lib/understand/types.ts', '.lovable/src/lib/understand/types.ts'),
    @('src/lib/understand/context.ts', '.lovable/src/lib/understand/context.ts'),
    @('src/lib/understand/diff.ts', '.lovable/src/lib/understand/diff.ts'),
    @('src/lib/understand/agent-context.ts', '.lovable/src/lib/understand/agent-context.ts'),
    @('src/lib/understand/index.ts', '.lovable/src/lib/understand/index.ts'),
    @('src/components/workspace/KnowledgeGraphPanel.tsx', '.lovable/src/components/workspace/KnowledgeGraphPanel.tsx'),
    @('src/pages/WorkspacePage.tsx', '.lovable/src/pages/WorkspacePage.tsx')
)

foreach($pair in $pairs) {
    $a = $pair[0]; $b = $pair[1]
    if((Test-Path $a) -and (Test-Path $b)) {
        $ha = (Get-FileHash $a).Hash
        $hb = (Get-FileHash $b).Hash
        if($ha -eq $hb) {
            Write-Host "SYNC  $a"
        } else {
            Write-Host "DIFF  $a vs $b"
            $allOk = $false
        }
    } else {
        Write-Host "SKIP  $a (one or both missing)"
    }
}

if($allOk) { exit 0 } else { exit 1 }
