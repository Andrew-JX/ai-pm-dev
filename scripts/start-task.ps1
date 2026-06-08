param(
  [Parameter(Mandatory = $true)]
  [string]$Task,
  [string]$Type = "",
  [string]$Target = (Get-Location).Path,
  [switch]$Save
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeScript = Join-Path $scriptDir "start-task.mjs"
$argsList = @($nodeScript, "--task", $Task, "--target", $Target)

if ($Type) {
  $argsList += @("--type", $Type)
}

if ($Save) {
  $argsList += "--save"
}

node @argsList
exit $LASTEXITCODE
