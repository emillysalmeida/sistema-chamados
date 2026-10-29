---
trigger: always_on
description: "Documentar alterações e preservar a continuidade do projeto Central de Serviços MTP."
---
# Regra permanente — Central de Serviços MTP

Antes de qualquer alteração, consulte o spec.md e os arquivos de acompanhamento disponíveis.

1. Preserve as funcionalidades existentes que não fazem parte da tarefa.
2. Após CADA alteração concluída, registre em docsHISTORICO.md descrição, arquivos modificados, testes, resultado e pendências.
3. A cada 5 alterações, atualize docsESTADO_ATUAL.md.
4. Ao encerrar uma sessão, atualize o estado atual mesmo antes da quinta alteração.
5. Antes de iniciar outra tarefa, consulte o histórico e verifique o código existente.
6. Não marque funcionalidades como concluídas sem validação.
7. Não apague o histórico anterior nem exponha credenciais.
8. Não execute commits ou push sem autorização.
9. Caso os arquivos de documentação não existam, crie-os.
10. Se a tarefa ficar incompleta, documente exatamente o que falta.
  