[CmdletBinding()]
param(
    [Alias('dry-run')]
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$repoDir = $PSScriptRoot
$repoName = Split-Path $repoDir -Leaf
$claudeDir = if ($env:CLAUDE_HOME) { $env:CLAUDE_HOME } else { Join-Path $HOME '.claude' }

function Assert-SafeDestination {
    param([string]$Path)

    $rootFullPath = [IO.Path]::GetFullPath($claudeDir).TrimEnd([char]92, [char]47)
    $candidateFullPath = [IO.Path]::GetFullPath($Path)
    $prefix = $rootFullPath + [IO.Path]::DirectorySeparatorChar
    if ($candidateFullPath -eq $rootFullPath -or -not $candidateFullPath.StartsWith($prefix)) {
        throw "Refusing to delete outside CLAUDE_HOME: $candidateFullPath"
    }
}

function Install-Group {
    param(
        [string]$SourceSubdir,
        [string]$TargetSubdir,
        [string]$Label
    )

    $source = Join-Path $repoDir $SourceSubdir
    $destinationRoot = Join-Path $claudeDir $TargetSubdir
    if (-not (Test-Path $source -PathType Container)) {
        Write-Output "  (${Label}: missing, skipped)"
        return
    }

    if (-not $DryRun) {
        New-Item -ItemType Directory -Force -Path $destinationRoot | Out-Null
    }

    $count = 0
    foreach ($item in Get-ChildItem -LiteralPath $source -Directory) {
        $baseName = $item.Name
        $destination = Join-Path $destinationRoot $baseName
        Assert-SafeDestination -Path $destination

        if (-not $DryRun) {
            if (Test-Path $destination) {
                Remove-Item -LiteralPath $destination -Recurse -Force -ErrorAction SilentlyContinue
            }
            Copy-Item -LiteralPath $item.FullName -Destination $destination -Recurse -Force -ErrorAction Stop
        }
        Write-Output "  + $TargetSubdir/$baseName"
        $count += 1
    }
    Write-Output "  -> ${Label}: $count item(s)"
}

function Install-Files {
    param(
        [string]$SourceSubdir,
        [string]$TargetSubdir,
        [string]$Label
    )

    $source = Join-Path $repoDir $SourceSubdir
    $destinationRoot = Join-Path $claudeDir $TargetSubdir
    if (-not (Test-Path $source -PathType Container)) {
        Write-Output "  (${Label}: missing, skipped)"
        return
    }

    if (-not $DryRun) {
        New-Item -ItemType Directory -Force -Path $destinationRoot | Out-Null
    }

    $count = 0
    foreach ($item in Get-ChildItem -LiteralPath $source -File -Filter '*.md') {
        $baseName = $item.Name
        $destination = Join-Path $destinationRoot $baseName
        Assert-SafeDestination -Path $destination

        if (-not $DryRun) {
            if (Test-Path $destination) {
                Remove-Item -LiteralPath $destination -Force -ErrorAction SilentlyContinue
            }
            Copy-Item -LiteralPath $item.FullName -Destination $destination -Force -ErrorAction Stop
        }
        Write-Output "  + $TargetSubdir/$baseName"
        $count += 1
    }
    Write-Output "  -> ${Label}: $count item(s)"
}

Write-Output "$repoName -> $claudeDir$(if ($DryRun) { ' (dry-run)' })"
Install-Group -SourceSubdir 'skills' -TargetSubdir 'skills' -Label 'skills'
Install-Group -SourceSubdir 'commands' -TargetSubdir 'commands' -Label 'commands'
Install-Files -SourceSubdir 'agents' -TargetSubdir 'agents' -Label 'agents'
Write-Output 'Done.'
