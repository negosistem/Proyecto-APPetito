param(
    [int[]]$Ports = @(8000, 5173)
)

$connections = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $Ports -contains $_.LocalPort }

$processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique

if (-not $processIds) {
    Write-Host "No se encontraron procesos de APPetito en los puertos $($Ports -join ', ')."
    exit 0
}

foreach ($processId in $processIds) {
    try {
        Stop-Process -Id $processId -Force -ErrorAction Stop
        Write-Host "Proceso detenido: $processId"
    } catch {
        Write-Warning "No se pudo detener el proceso ${processId}: $($_.Exception.Message)"
    }
}
