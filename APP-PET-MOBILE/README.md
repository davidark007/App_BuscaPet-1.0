# BuscaPet Mobile

App Expo que abre o BuscaPet web em uma WebView, usando o IP local da maquina onde backend e frontend estao rodando.

O app pede permissao de localizacao do celular para mostrar onde o usuario esta no mapa e desenhar a trilha ate a ultima posicao do pet.

## Como rodar

Na raiz do projeto, use:

```powershell
python .\BuscaPet_Start-mobile.py
```

O script inicia backend, frontend e Expo. Depois, escaneie o QR Code do terminal com o app Expo Go no celular.

O celular precisa estar na mesma rede Wi-Fi do computador.

Se o IP do computador mudar, toque em `Trocar` dentro do app e informe o novo endereco exibido pelo script.
