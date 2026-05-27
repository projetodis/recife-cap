# ============================================
# Recife Cap — Setup Automatico do Agente
# ============================================

Write-Host "Iniciando setup do Agente Recife Cap..." -ForegroundColor Green

# Caminho do projeto
$projeto = "C:\Users\pc-residencia\Downloads\sorteio-cap"
Set-Location $projeto

# ============================================
# 1. Verificar Node e NPM
# ============================================
Write-Host "`n[1/6] Verificando ambiente..." -ForegroundColor Cyan
$nodeVersion = node --version
$npmVersion = npm --version
Write-Host "Node: $nodeVersion | NPM: $npmVersion"

# ============================================
# 2. Verificar dependencias
# ============================================
Write-Host "`n[2/6] Verificando dependencias..." -ForegroundColor Cyan
if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando dependencias..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "Dependencias OK" -ForegroundColor Green
}

# ============================================
# 3. Verificar .env.local
# ============================================
Write-Host "`n[3/6] Verificando .env.local..." -ForegroundColor Cyan
if (Test-Path ".env.local") {
    Write-Host ".env.local encontrado OK" -ForegroundColor Green
} else {
    Write-Host "AVISO: .env.local nao encontrado!" -ForegroundColor Red
}

# ============================================
# 4. Verificar build
# ============================================
Write-Host "`n[4/6] Verificando build..." -ForegroundColor Cyan
$buildResult = npm run build 2>&1
$buildErrors = $buildResult | Select-String "error" -CaseSensitive
if ($buildErrors) {
    Write-Host "ERROS no build:" -ForegroundColor Red
    $buildErrors | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
} else {
    Write-Host "Build OK - sem erros" -ForegroundColor Green
}

# ============================================
# 5. Status do Git
# ============================================
Write-Host "`n[5/6] Status do Git..." -ForegroundColor Cyan
$gitStatus = git status --short
if ($gitStatus) {
    Write-Host "Arquivos modificados:" -ForegroundColor Yellow
    $gitStatus | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
} else {
    Write-Host "Repositorio limpo" -ForegroundColor Green
}
$ultimosCommits = git log --oneline -5
Write-Host "`nUltimos commits:" -ForegroundColor Cyan
$ultimosCommits | ForEach-Object { Write-Host "  $_" }

# ============================================
# 6. Gerar relatorio para o agente
# ============================================
Write-Host "`n[6/6] Gerando relatorio..." -ForegroundColor Cyan

$data = Get-Date -Format "yyyy-MM-dd HH:mm"
$dataArquivo = Get-Date -Format "yyyy-MM-dd"

$relatorio = @"
# Status do Projeto - $data

## Ambiente
- Node: $nodeVersion
- NPM: $npmVersion
- Projeto: $projeto

## Build
$(if ($buildErrors) { "ERROS ENCONTRADOS - verificar" } else { "OK - sem erros" })

## Git
$(if ($gitStatus) { "Arquivos modificados:" + "`n" + ($gitStatus -join "`n") } else { "Repositorio limpo" })

## Ultimos commits
$($ultimosCommits -join "`n")

## Pendencias conhecidas
1. CSS variables white label nao aplicam globalmente
2. Relatorios do PDV (caixa do dia)
3. Gateway PIX Asaas (hoje simulado)
4. Validacao de PIX do distribuidor
5. App mobile cliente
6. Deploy Vercel

## URLs de teste
- Cliente: http://localhost:3000/cliente
- Admin: http://localhost:3000/admin
- Distribuidor: http://localhost:3000/distribuidor
- PDV: http://localhost:3000/pdv
- Motoboy: http://localhost:3000/motoboy
"@

# Salvar relatorio na pasta do agente
$pastaMemoria = "$projeto\agente\memory"
if (-not (Test-Path $pastaMemoria)) {
    New-Item -ItemType Directory -Path $pastaMemoria -Force | Out-Null
}

$relatorio | Out-File "$pastaMemoria\$dataArquivo.md" -Encoding UTF8
Write-Host "Relatorio salvo em: agente\memory\$dataArquivo.md" -ForegroundColor Green

# ============================================
# Resumo final
# ============================================
Write-Host "`n============================================" -ForegroundColor Green
Write-Host "Agente Recife Cap pronto!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Cyan
Write-Host "  1. npm run dev        (iniciar servidor local)" -ForegroundColor White
Write-Host "  2. Abrir http://localhost:3000/admin" -ForegroundColor White
Write-Host "  3. Enviar tarefas pelo OpenClaw" -ForegroundColor White
Write-Host ""
