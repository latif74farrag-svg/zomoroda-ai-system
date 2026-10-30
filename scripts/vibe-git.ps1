param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$GitArgs
)

$gitPath = if (Get-Command git -ErrorAction SilentlyContinue) {
    "git"
} elseif (Test-Path "C:\Program Files\Git\cmd\git.exe") {
    "C:\Program Files\Git\cmd\git.exe"
} else {
    Write-Error "Git executable not found."
    exit 1
}

& $gitPath @GitArgs
