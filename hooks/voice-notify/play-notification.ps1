param(
    [Parameter(Mandatory = $true)]
    [string]$Path
)

$ErrorActionPreference = 'Stop'
try {
    Add-Type -AssemblyName PresentationCore
    $player = New-Object System.Windows.Media.MediaPlayer
    $player.Open($Path)
    $player.Play()
    Start-Sleep -Milliseconds 2000
} catch {
    $player = New-Object -ComObject WMPlayer.OCX
    $player.URL = $Path
    $player.controls.play()
    Start-Sleep -Milliseconds 2000
}
