Write-Host "Iniciando processo de autenticação e publicação no GitHub..." -ForegroundColor Green
gh auth login

if ($LASTEXITCODE -ne 0) {
    Write-Host "Falha na autenticação do GitHub CLI. Encerrando." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "Criando repositório 'app-treino-evolucao' no GitHub e enviando o código..." -ForegroundColor Green
gh repo create app-treino-evolucao --public --source=. --push

if ($LASTEXITCODE -ne 0) {
    Write-Host "Ocorreu um erro ao criar o repositório. Verifique se ele já existe em sua conta." -ForegroundColor Yellow
    Write-Host "Tentando vincular o repositório existente..." -ForegroundColor Cyan
    git remote add origin "https://github.com/noomanvalini/app-treino-evolucao.git"
    git branch -M main
    git push -u origin main
} else {
    Write-Host "Sucesso! Seu repositório foi criado e o código foi enviado." -ForegroundColor Green
}
