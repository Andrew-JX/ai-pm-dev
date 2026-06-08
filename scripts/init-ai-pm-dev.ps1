param(
  [Parameter(Mandatory = $true)]
  [string]$Target,
  [switch]$DryRun,
  [switch]$Force,
  [switch]$IncludeReadme
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeScript = Join-Path $scriptDir "init-ai-pm-dev.mjs"
$argsList = @($nodeScript, "--target", $Target)

if ($DryRun) {
  $argsList += "--dry-run"
}

if ($Force) {
  $argsList += "--force"
}

if ($IncludeReadme) {
  $argsList += "--include-readme"
}

node @argsList
exit $LASTEXITCODE
